import "server-only";
import { isMachineReply } from "@/lib/email-parsing/subjects";
import { timingSafeEqual } from "node:crypto";
import { copy } from "@/lib/content/email-your-mp";
import { now } from "@/lib/now";
import { query, transaction } from "./db";
import { isBlocked, send, type DeliveryProblem } from "./email";
import type { HandlingReason, ReplyHandling } from "./letters";
import { lettersDomain, notifyDomain, type Attachment } from "./outside-services/postmark";
import { nameLine } from "./proxies";

// What Postmark tells us: bounces and spam complaints, and replies to
// letters. Postmark doesn't sign webhooks, so each webhook URL carries a
// username and password (basic auth, over HTTPS), and requests without them
// are refused.

/** Whether a webhook request carries our basic auth credentials. Without them set, none does. */
export function isPostmark(request: Request): boolean {
  const user = process.env.POSTMARK_WEBHOOK_USER;
  const password = process.env.POSTMARK_WEBHOOK_PASSWORD;
  if (!user || !password) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Postmark's bounce and spam complaint webhooks' payloads, as far as we read them. */
export type PostmarkProblem = {
  RecordType?: string;
  /** The bounce's own ID. */
  ID?: number;
  MessageID?: string;
  Type?: string;
  Description?: string;
  Email?: string;
  /** Whether Postmark suppressed the address because of it. */
  Inactive?: boolean;
  /** Whether Postmark would send to it again if asked. */
  CanActivate?: boolean;
};

/**
 * Whether a bounce is an automatic reply, such as an out-of-office, sent to
 * the email's bounce address (Return-Path) rather than its From.
 */
function isAutoResponder(payload: PostmarkProblem): boolean {
  return payload.RecordType === "Bounce" && payload.Type === "AutoResponder";
}

/**
 * A bounce or complaint in Postmark's words, as any provider's: hard when
 * Postmark suppressed the address, else soft. Undefined for anything else,
 * an automatic reply included: the email was delivered.
 */
export function deliveryProblem(payload: PostmarkProblem): DeliveryProblem | undefined {
  const kind =
    payload.RecordType === "SpamComplaint"
      ? "complaint"
      : payload.RecordType === "Bounce" && !isAutoResponder(payload)
        ? payload.Inactive
          ? "hard"
          : "soft"
        : undefined;
  if (!kind || !payload.Email) return undefined;
  return {
    address: payload.Email,
    messageId: payload.MessageID ?? null,
    kind,
    reason: payload.Description ?? "",
    canReset: payload.CanActivate === true,
    details: { type: payload.Type },
  };
}

/**
 * Adds an 'auto_reply' event to the letter an automatic reply that Postmark
 * reported as a bounce answers, once per bounce. Returns whether it was one.
 */
export async function recordAutoResponder(payload: PostmarkProblem): Promise<boolean> {
  if (!isAutoResponder(payload)) return false;
  const handling: ReplyHandling[] = [{ outcome: "not_forwarded", reason: "bounce_address" }];
  const details = { from: payload.Email ?? "", bounceId: payload.ID ?? null, handling };
  await query(
    `INSERT INTO letter_events (letter_id, status, details)
     SELECT s.letter_id, 'auto_reply', $2 FROM email_sends s
     WHERE s.message_id = $1 AND s.letter_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = s.letter_id AND e.status = 'auto_reply'
                       AND e.details->>'bounceId' = $3)
     LIMIT 1`,
    [payload.MessageID ?? null, JSON.stringify(details), String(details.bounceId)],
  );
  return true;
}

type Address = { Email?: string; Name?: string };

/** isMachineReply(), for an inbound email in Postmark's form. */
export function isAutoReply(email: InboundEmail): boolean {
  return isMachineReply(
    (name) => email.Headers?.find((h) => h.Name?.toLowerCase() === name)?.Value,
    email.Subject ?? "",
  );
}

/**
 * Adds a 'replied' event to the letter, or 'auto_reply' for one sent by a
 * machine, once per message (Postmark tries again if forwarding fails). A
 * person's reply from anyone but the sender, who may write back into the
 * thread, marks the letter as replied to.
 */
async function recordReply(letter: { id: number; senderEmail: string }, email: InboundEmail): Promise<number> {
  const from = email.FromFull?.Email ?? "";
  const status = isAutoReply(email) ? "auto_reply" : "replied";
  const details = {
    from,
    name: email.FromFull?.Name ?? "",
    to: addresses(email.ToFull),
    cc: addresses(email.CcFull),
    replyTo: email.ReplyTo || undefined,
    messageId: email.MessageID ?? null,
    // What received it, as every email's event says (sentBy in email.ts).
    backend: "postmark",
  };
  return transaction(async (db) => {
    await query("SELECT 1 FROM letters WHERE id = $1 FOR UPDATE", [letter.id], db);
    if (details.messageId) {
      const [seen] = await query<{ id: number }>(
        "SELECT id::int AS id FROM letter_events WHERE letter_id = $1 AND status IN ('replied', 'auto_reply') AND details->>'messageId' = $2",
        [letter.id, details.messageId],
        db,
      );
      if (seen) return seen.id;
    }
    const [event] = await query<{ id: number }>(
      "INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3) RETURNING id::int AS id",
      [letter.id, status, JSON.stringify(details)],
      db,
    );
    if (status === "replied" && from.toLowerCase() !== letter.senderEmail.toLowerCase()) {
      await query("UPDATE letters SET replied_at = coalesce(replied_at, now()) WHERE id = $1", [letter.id], db);
    }
    return event.id;
  });
}

/** The addresses of a list of them, as a line: "a@example.com, b@example.com"; none for an empty list. */
function addresses(list: Address[] | undefined): string | undefined {
  return (
    list
      ?.map((a) => a.Email)
      .filter(Boolean)
      .join(", ") || undefined
  );
}

/** Adds to a reply's event how it was handled, replacing any from an earlier try. */
async function noteHandling(eventId: number, handling: ReplyHandling[]): Promise<void> {
  await query("UPDATE letter_events SET details = details || jsonb_build_object('handling', $2::jsonb) WHERE id = $1", [
    eventId,
    JSON.stringify(handling),
  ]);
}

export type InboundEmail = {
  MessageID?: string;
  OriginalRecipient?: string;
  FromFull?: Address;
  ToFull?: Address[];
  CcFull?: Address[];
  BccFull?: Address[];
  Subject?: string;
  Date?: string;
  Headers?: { Name?: string; Value?: string }[];
  /** The Reply-To line, as it came. */
  ReplyTo?: string;
  TextBody?: string;
  Attachments?: Attachment[];
};

/**
 * The mailboxes an email may be a reply to: each of our addresses it was
 * sent to, lowercased, the one Postmark delivered it to first. An older
 * letter's address is reply+<hex>, and only the hex is kept.
 */
function letterMailboxes(email: InboundEmail): string[] {
  const suffix = `@${lettersDomain()}`;
  return [email.OriginalRecipient, ...[email.ToFull, email.CcFull, email.BccFull].flat().map((a) => a?.Email)]
    .map((address) => address?.toLowerCase() ?? "")
    .filter((address) => address.endsWith(suffix))
    .map((address) => address.slice(0, -suffix.length).replace(/^reply\+/, ""));
}

/**
 * Records a reply to a letter, and forwards it to the shared inbox and to the
 * sender, unless they already have it (their address is in its To or Cc). The
 * sender's own follow-up, sent to the MP and the letter's address from our
 * forward's Reply-To, goes to the shared inbox only. The shared inbox's copy
 * says when the sender wasn't sent one because they're copied in or their
 * address is blocked. Only when it came and who from is kept, not its text.
 * Returns who it went to.
 */
export async function forwardReply(email: InboundEmail): Promise<string[]> {
  const from = email.FromFull?.Email ?? "";
  // Our own mail coming back round, such as a forwarded copy: never forward it again.
  const ours = [lettersDomain(), notifyDomain()].some((domain) => from.toLowerCase().endsWith(`@${domain}`));
  const mailboxes = letterMailboxes(email);
  if (!mailboxes.length || ours) return [];

  const [letter] = await query<{
    id: number;
    senderName: string;
    senderEmail: string;
    mpName: string;
    mailbox: string;
  }>(
    `SELECT l.id::int AS id, f.name AS "senderName", f.email AS "senderEmail", p.name AS "mpName",
       s.postmark_mailbox AS mailbox
     FROM letters_from_supporters s JOIN letters l ON l.id = s.id JOIN form_entries f ON f.id = s.entry_id
       JOIN notable_people p ON p.id = l.notable_person_id
     WHERE s.postmark_mailbox = ANY($1) ORDER BY array_position($1, s.postmark_mailbox) LIMIT 1`,
    [mailboxes],
  );
  if (!letter) return [];
  const eventId = await recordReply(letter, email);

  // Who it might go to, and why: the shared inbox, then the sender, each
  // left out if they already have it, and the sender if they wrote it.
  const fromSender = from.toLowerCase() === letter.senderEmail.toLowerCase();
  const copied = [...(email.ToFull ?? []), ...(email.CcFull ?? [])].map((a) => a.Email?.toLowerCase());
  const plan = (
    [
      [process.env.POLICY_INBOX, "policy_inbox"],
      [letter.senderEmail, "sender"],
    ] as const
  )
    .filter((entry): entry is [string, "policy_inbox" | "sender"] => !!entry[0])
    .map(([to, why]): { to: string; reason: HandlingReason; forward: boolean } =>
      why === "sender" && fromSender
        ? { to, reason: "own_follow_up", forward: false }
        : copied.includes(to.toLowerCase())
          ? { to, reason: "copied", forward: false }
          : { to, reason: why, forward: true },
    );
  const handling: ReplyHandling[] = [];

  // The letter's own Message-ID, so the forward joins the letter's thread for anyone
  // who has the letter: the sender on Cc, the shared inbox on Bcc.
  const [sentLetter] = await query<{ messageId: string }>(
    `SELECT message_id AS "messageId" FROM email_sends
     WHERE letter_id = $1 AND purpose = 'letter' AND message_id IS NOT NULL ORDER BY at DESC LIMIT 1`,
    [letter.id],
  );
  const threading = sentLetter
    ? ["In-Reply-To", "References"].map((Name) => ({ Name, Value: `<${sentLetter.messageId}@mtasv.net>` }))
    : undefined;

  const named = (list: Address[] | undefined) =>
    list
      ?.filter((a) => a.Email)
      .map((a) => (a.Name ? `${a.Name} <${a.Email}>` : a.Email))
      .join(", ");
  const original = [
    `From: ${email.FromFull?.Name ?? ""} <${from}>`,
    ...[
      ["To", named(email.ToFull)],
      ["Cc", named(email.CcFull)],
    ].flatMap(([field, list]) => (list ? [`${field}: ${list}`] : [])),
    `Date: ${email.Date ?? ""}`,
    `Subject: ${email.Subject ?? ""}`,
  ].join("\n");
  // Why the sender won't get a copy, for the shared inbox's: their own follow-up says so already.
  const senderNote = fromSender
    ? undefined
    : copied.includes(letter.senderEmail.toLowerCase())
      ? copy.forwardedReply.senderCopied(letter.senderName)
      : (await isBlocked(letter.senderEmail))
        ? copy.forwardedReply.senderBlocked(letter.senderName)
        : undefined;
  const sentTo: string[] = [];
  for (const { to, reason, forward } of plan) {
    if (!forward) {
      handling.push({ outcome: "not_forwarded", to, reason });
      continue;
    }
    const result = await send(
      {
        From: `PauseAI UK <noreply@${notifyDomain()}>`,
        To: to === letter.senderEmail ? nameLine(letter.senderName, to) : to,
        // Answering it reaches whoever wrote, and the letter's address, so it's kept with the letter.
        ReplyTo: [from, `${letter.mailbox}@${lettersDomain()}`].filter(Boolean).join(", "),
        Subject: email.Subject ?? "",
        TextBody: `${
          fromSender
            ? copy.forwardedReply.followUp(letter.senderName, letter.mpName)
            : to === letter.senderEmail
              ? copy.forwardedReply.toSender(letter.mpName)
              : [copy.forwardedReply.toInbox(letter.mpName, letter.senderName), senderNote].filter(Boolean).join("\n\n")
        }\n\n${original}\n\n${email.TextBody ?? ""}`,
        Headers: threading,
        Attachments: email.Attachments?.map(({ Name, Content, ContentType }) => ({ Name, Content, ContentType })),
        Tag: "forwarded-reply",
      },
      "forwarded-reply",
      letter.id,
    );
    if (result.sent) sentTo.push(to);
    handling.push(
      result.sent
        ? { outcome: "forwarded", to, reason, at: now().toISOString() }
        : { outcome: "failed", to, reason: result.reason === "blocked" ? "blocked" : "refused" },
    );
    // Thrown, so Postmark tries again. A blocked address is skipped: it would never work.
    if (!result.sent && result.reason === "failed") {
      await noteHandling(eventId, handling);
      throw new Error(`Couldn't forward a reply to letter ${letter.id}`);
    }
  }
  await noteHandling(eventId, handling);
  return sentTo;
}
