import "server-only";
import { timingSafeEqual } from "node:crypto";
import { copy } from "@/lib/content/email-your-mp";
import { query, transaction } from "./db";
import { lettersDomain, notifyDomain, sendEmail, type Attachment } from "./postmark";

// What Postmark tells us: bounces and spam complaints about letters, and
// replies to them. Postmark doesn't sign webhooks, so each webhook URL
// carries a username and password (basic auth, over HTTPS), and requests
// without them are refused.

/** Whether a webhook request carries our basic auth credentials. Without them set, none does. */
export function isPostmark(request: Request): boolean {
  const user = process.env.POSTMARK_WEBHOOK_USER;
  const password = process.env.POSTMARK_WEBHOOK_PASSWORD;
  if (!user || !password) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type DeliveryProblem = { RecordType?: string; MessageID?: string; Type?: string; Description?: string; Email?: string };

const STATUSES: Record<string, string> = { Bounce: "bounced", SpamComplaint: "spam_complaint" };

/** Marks a letter bounced or complained about. Returns whether it was one of ours. */
export async function recordDeliveryProblem(payload: DeliveryProblem): Promise<boolean> {
  const status = STATUSES[payload.RecordType ?? ""];
  if (!status || !payload.MessageID) return false;
  const [letter] = await query<{ id: number }>(
    "UPDATE letters SET status = $2 WHERE postmark_message_id = $1 RETURNING id::int AS id",
    [payload.MessageID, status],
  );
  if (!letter) return false;
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [
    letter.id,
    status,
    JSON.stringify({ type: payload.Type, description: payload.Description, email: payload.Email }),
  ]);
  return true;
}

type Address = { Email?: string; Name?: string };

const AUTO_REPLY_SUBJECT = /^\s*(automatic reply|auto[- ]?reply|auto[- ]?response|out of (the )?office)\b/i;

/**
 * Whether an email was sent by a machine rather than a person: an office's
 * acknowledgement or out-of-office. By the headers that mark them (RFC 3834's
 * Auto-Submitted, and the older X-Autoreply, X-Autorespond and Precedence),
 * or failing those, a subject such as Outlook's "Automatic reply:".
 */
export function isAutoReply(email: InboundEmail): boolean {
  const header = (name: string) =>
    email.Headers?.find((h) => h.Name?.toLowerCase() === name)
      ?.Value?.trim()
      .toLowerCase();
  const autoSubmitted = header("auto-submitted");
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (header("x-autoreply") !== undefined || header("x-autorespond") !== undefined) return true;
  if (["auto_reply", "bulk", "junk"].includes(header("precedence") ?? "")) return true;
  return AUTO_REPLY_SUBJECT.test(email.Subject ?? "");
}

/**
 * Adds a 'replied' event to the letter, or 'auto_reply' for one sent by a
 * machine, once per message (Postmark tries again if forwarding fails). A
 * person's reply from anyone but the sender, who may write back into the
 * thread, marks the letter as replied to.
 */
async function recordReply(letter: { id: number; senderEmail: string }, email: InboundEmail): Promise<void> {
  const from = email.FromFull?.Email ?? "";
  const status = isAutoReply(email) ? "auto_reply" : "replied";
  const details = { from, name: email.FromFull?.Name ?? "", messageId: email.MessageID ?? null };
  await transaction(async (db) => {
    await query("SELECT 1 FROM letters WHERE id = $1 FOR UPDATE", [letter.id], db);
    if (details.messageId) {
      const [seen] = await query(
        "SELECT 1 FROM letter_events WHERE letter_id = $1 AND status IN ('replied', 'auto_reply') AND details->>'messageId' = $2",
        [letter.id, details.messageId],
        db,
      );
      if (seen) return;
    }
    await query(
      "INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)",
      [letter.id, status, JSON.stringify(details)],
      db,
    );
    if (status === "replied" && from.toLowerCase() !== letter.senderEmail.toLowerCase()) {
      await query("UPDATE letters SET replied_at = coalesce(replied_at, now()) WHERE id = $1", [letter.id], db);
    }
  });
}

export type InboundEmail = {
  MessageID?: string;
  MailboxHash?: string;
  FromFull?: Address;
  ToFull?: Address[];
  CcFull?: Address[];
  Subject?: string;
  Date?: string;
  Headers?: { Name?: string; Value?: string }[];
  TextBody?: string;
  Attachments?: Attachment[];
};

/**
 * Records a reply to a letter, and forwards it to the shared inbox and to the
 * sender, unless they already have it (their address is in its To or Cc).
 * Only when it came and who from is kept, not its text. Returns who it went to.
 */
export async function forwardReply(email: InboundEmail): Promise<string[]> {
  const from = email.FromFull?.Email ?? "";
  // Our own mail coming back round, such as a forwarded copy: never forward it again.
  const ours = [lettersDomain(), notifyDomain()].some((domain) => from.toLowerCase().endsWith(`@${domain}`));
  if (!email.MailboxHash || ours) return [];

  const [letter] = await query<{ id: number; senderName: string; senderEmail: string; mpName: string }>(
    `SELECT l.id::int AS id, l.sender_name AS "senderName", l.sender_email AS "senderEmail", p.name AS "mpName"
     FROM letters l JOIN politicians p ON p.id = l.politician_id WHERE l.reply_hash = $1`,
    [email.MailboxHash],
  );
  if (!letter) return [];
  await recordReply(letter, email);

  const copied = [...(email.ToFull ?? []), ...(email.CcFull ?? [])].map((a) => a.Email?.toLowerCase());
  const recipients = [process.env.REPLIES_INBOX, letter.senderEmail].filter(
    (to): to is string => !!to && !copied.includes(to.toLowerCase()),
  );

  const original = [
    `From: ${email.FromFull?.Name ?? ""} <${from}>`,
    `Date: ${email.Date ?? ""}`,
    `Subject: ${email.Subject ?? ""}`,
  ].join("\n");
  for (const to of recipients) {
    await sendEmail({
      From: `PauseAI UK <noreply@${notifyDomain()}>`,
      To: to,
      ReplyTo: from,
      Subject: copy.forwardedReply.subject(email.Subject ?? ""),
      TextBody: `${copy.forwardedReply.note(letter.mpName, letter.senderName)}\n\n${original}\n\n${email.TextBody ?? ""}`,
      Attachments: email.Attachments?.map(({ Name, Content, ContentType }) => ({ Name, Content, ContentType })),
      Tag: "forwarded-reply",
    });
  }
  return recipients;
}
