import "server-only";
import { gzipSync } from "node:zlib";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import { importPath, type GmailRead, type GmailReadResult } from "@/lib/import-runs";
import { gmailMessageLink } from "@/lib/letter-links";
import { query } from "./db";
import { handleDeliveryProblem } from "./delivery-problems";
import { sentBy } from "./email";
import { lettersInbox } from "./letters-inbox";
import { readLettersInbox } from "./letters-inbox-reading";
import { notifyStaff, staffLink } from "./notifications";
import { gmailAccess, gmailReadingState, saveGmailName, saveHistoryId } from "./gmail-accounts";
import { keepingFailure, recordRun } from "./import-runs";
import { keepIfPoliticianThread, reportUnmatchedMail } from "./one-off-emails";
import {
  allParts,
  decodeWords,
  fromAddress,
  messageIds,
  parseHeaders,
  parseMime,
  partText,
  type MimePart,
} from "./mime";
import { saveLetterReply } from "./outside-services/blobs";
import {
  gmailHistory,
  gmailMessageHeaders,
  gmailProfile,
  gmailRawMessage,
  unlessGone,
  gmailSendName,
  GmailError,
  searchGmail,
  type GmailMessageHeaders,
} from "./outside-services/gmail";
import type { ReplyHandling } from "./letters";
import { isMachineReply } from "./postmark-webhooks";

// Reading the connected Gmail accounts, every 5 minutes: the replies to PauseAI's
// letters and the bounces of them. For each message that arrived since the
// last read, the site fetches only the few headers that say what it
// answers; it fetches whole only the messages in our letters' threads, and
// bounces. A politician's reply, or our answer to it, is kept whole
// (letter_replies, and the message in Netlify Blobs); an automatic reply is
// only noted on the letter; a bounce is recorded as Postmark's are. Anything
// else, in an account that keeps them, may be a one-off email
// (one-off-emails.ts). Each run is in the import log as "read-gmail".

const JOB = "read-gmail";

/** The headers that say what a message is and what it answers. */
const HEADERS = [
  "From",
  "To",
  "Cc",
  "Reply-To",
  "Subject",
  "Message-ID",
  "In-Reply-To",
  "References",
  "Auto-Submitted",
  "X-Autoreply",
  "X-Autorespond",
  "Precedence",
  "X-Original-From",
  "List-Id",
];

/**
 * Bounces from another server than Gmail's may not be in the letter's
 * thread, or name it, so they're also searched for, as far back as a
 * bounce can come late.
 */
const BOUNCE_SEARCH = "from:mailer-daemon OR from:postmaster newer_than:3d";

/** When the mailbox's history has gone, what's searched instead, to miss nothing since the last read. */
const RESTART_SEARCH = "newer_than:3d";

/** The same for the letters inbox, its Spam and Sent included, which the history has too. */
const LETTERS_RESTART_SEARCH = "in:anywhere newer_than:3d";

/** Whether a sender is a mail server reporting a bounce. */
const isBounceSender = (address: string) => /^(mailer-daemon|postmaster)@/.test(address);

/**
 * The letter a message is in the thread of: one whose Message-ID it
 * answers, or that a kept message it answers belongs to; or, in the mailbox
 * the letter went from, one in the same Gmail thread.
 */
async function letterAnswered(account: string, message: GmailMessageHeaders): Promise<number | undefined> {
  const refs = [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))];
  const [row] = await query<{ letterId: number }>(
    `SELECT letter_id::int AS "letterId" FROM (
       SELECT letter_id, 1 AS rank FROM email_sends WHERE (purpose = 'mailing' OR imported) AND rfc_message_id = ANY($1)
       UNION ALL SELECT letter_id, 2 FROM letter_replies WHERE rfc_message_id = ANY($1)
       UNION ALL SELECT letter_id, 3 FROM email_sends WHERE (purpose = 'mailing' OR imported) AND sender = $2 AND gmail_thread_id = $3
       UNION ALL SELECT letter_id, 4 FROM letter_replies WHERE account = $2 AND gmail_thread_id = $3
     ) found WHERE letter_id IS NOT NULL ORDER BY rank LIMIT 1`,
    [refs, account, message.threadId],
  );
  return row?.letterId;
}

/**
 * Whether a message is one we sent as a letter, which the mailbox has in
 * Sent: by its Message-ID, or in the mailbox it went from, by Gmail's own
 * ID for it, as Gmail can send an email with a Message-ID of its own.
 */
async function isOurLetter(account: string, message: GmailMessageHeaders): Promise<boolean> {
  const [id] = messageIds(message.headers.get("message-id"));
  const [row] = await query(
    `SELECT 1 FROM email_sends
     WHERE rfc_message_id = $1 OR (backend = 'gmail' AND sender = $2 AND message_id = $3)`,
    [id ?? null, account, message.id],
  );
  return !!row;
}

/** What keepReply is told beyond the message, by a reader that knows more: see there. */
type KeepReplyOptions = { raw?: Buffer; from?: { address: string; name: string }; fromUs?: boolean };

/**
 * Keeps a message in a letter's thread whole, and marks the letter replied
 * to if the politician wrote it. `from` is who wrote it, if the From says
 * otherwise; `raw` the message, if it's been read already; `fromUs` whether
 * it's one of ours, by default if it's from the account.
 */
export async function keepReply(
  account: string,
  token: string,
  letterId: number,
  message: GmailMessageHeaders,
  {
    raw: read,
    from = fromAddress(message.headers.get("from")),
    fromUs = from.address === account,
  }: KeepReplyOptions = {},
): Promise<void> {
  const raw = read ?? (await gmailRawMessage(token, message.id));
  const at = new Date(Number(message.internalDate));
  const key = `${account}/${message.id}.eml.gz`;
  await saveLetterReply(key, gzipSync(raw));
  const [kept] = await query(
    `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, rfc_message_id, from_address,
       from_name, subject, at, from_us, blob_key, size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (account, gmail_message_id) DO NOTHING RETURNING id`,
    [
      letterId,
      account,
      message.id,
      message.threadId,
      messageIds(message.headers.get("message-id"))[0] ?? null,
      from.address,
      from.name,
      message.headers.get("subject") ?? "",
      at,
      fromUs,
      key,
      raw.length,
    ],
  );
  if (!kept || fromUs) return;
  await query("UPDATE letters SET replied_at = coalesce(replied_at, $2) WHERE id = $1", [letterId, at]);
  await query("INSERT INTO letter_events (letter_id, at, status, details) VALUES ($1, $2, 'replied', $3)", [
    letterId,
    at,
    JSON.stringify({
      from: from.address,
      name: from.name,
      ...addressed(message),
      gmailMessageId: message.id,
      // What received it, as every email's event says (sentBy in email.ts).
      ...sentBy({ name: "gmail", account }),
    }),
  ]);
}

/**
 * Who a message read from Gmail was to, copied to and asked replies to go
 * to, a line each as it came, and that it went no further: it's already in
 * the mailbox, for whoever reads it.
 */
function addressed(message: GmailMessageHeaders) {
  const handling: ReplyHandling[] = [{ outcome: "not_forwarded", reason: "gmail" }];
  const line = (name: string) => {
    const value = message.headers.get(name);
    return value === undefined ? undefined : decodeWords(value);
  };
  return { to: line("to"), cc: line("cc"), replyTo: line("reply-to"), handling };
}

/** Notes an automatic reply on its letter, once, as of when it arrived. */
export async function noteAutoReply(letterId: number, message: GmailMessageHeaders): Promise<boolean> {
  const [seen] = await query(
    "SELECT 1 FROM letter_events WHERE letter_id = $1 AND status = 'auto_reply' AND details->>'gmailMessageId' = $2",
    [letterId, message.id],
  );
  if (seen) return false;
  await query("INSERT INTO letter_events (letter_id, at, status, details) VALUES ($1, $2, 'auto_reply', $3)", [
    letterId,
    new Date(Number(message.internalDate)),
    JSON.stringify({
      from: fromAddress(message.headers.get("from")).address,
      ...addressed(message),
      gmailMessageId: message.id,
    }),
  ]);
  return true;
}

/** One address a bounce says failed: what happened, in the server's words and its status code. */
export type BouncedAddress = { address: string; status: string; reason: string; delayed: boolean };

/**
 * What a bounce says: each address that failed, from its delivery report
 * (RFC 3464) or else its X-Failed-Recipients header; and the Message-ID of
 * the email that bounced, from the copy of it or its headers that it
 * carries, or else what the bounce answers.
 */
export function readBounce(raw: string): { addresses: BouncedAddress[]; messageId: string | undefined } {
  const message = parseMime(raw);
  const parts = allParts(message);
  const type = (part: MimePart) => (part.headers.get("content-type") ?? "").toLowerCase();
  const addresses: BouncedAddress[] = [];
  for (const report of parts.filter((part) => type(part).startsWith("message/delivery-status"))) {
    for (const block of partText(report)
      .split(/\r?\n\s*\r?\n/)
      .map(parseHeaders)) {
      const recipient = block.get("final-recipient") ?? block.get("original-recipient");
      if (!recipient) continue;
      const action = (block.get("action") ?? "").toLowerCase();
      if (action !== "failed" && action !== "delayed") continue;
      const status = block.get("status") ?? "";
      addresses.push({
        address: recipient.replace(/^[^;]*;\s*/, "").toLowerCase(),
        status,
        reason: block.get("diagnostic-code")?.replace(/^[^;]*;\s*/, "") ?? status,
        delayed: action === "delayed" || status.startsWith("4"),
      });
    }
  }
  if (!addresses.length) {
    for (const address of (message.headers.get("x-failed-recipients") ?? "").split(",")) {
      if (address.trim())
        addresses.push({ address: address.trim().toLowerCase(), status: "", reason: "", delayed: false });
    }
  }
  const original = parts.find((part) => part !== message && part.headers.has("message-id"));
  const headersPart = parts.find((part) => type(part).startsWith("text/rfc822-headers"));
  const messageId =
    messageIds(original?.headers.get("message-id"))[0] ??
    messageIds(headersPart && parseHeaders(partText(headersPart)).get("message-id"))[0] ??
    [...messageIds(message.headers.get("in-reply-to")), ...messageIds(message.headers.get("references"))][0];
  return { addresses, messageId };
}

/** Records each address a bounce says failed, as Postmark's bounces are, once. Returns how many. */
async function recordBounce(
  account: string,
  token: string,
  message: GmailMessageHeaders,
  request: Request | undefined,
): Promise<number> {
  const [seen] = await query("SELECT 1 FROM email_problems WHERE gmail_message_id = $1", [message.id]);
  if (seen) return 0;
  const bounce = readBounce((await gmailRawMessage(token, message.id)).toString("latin1"));
  // The email it names, or else ours in the same Gmail thread, where Gmail puts its own bounces.
  const [sent] = await query<{ messageId: string }>(
    `SELECT message_id AS "messageId" FROM email_sends
     WHERE outcome = 'sent'
       AND (rfc_message_id = $1 OR (backend = 'gmail' AND sender = $2 AND gmail_thread_id = $3))
     ORDER BY rfc_message_id = $1 DESC NULLS LAST, at DESC LIMIT 1`,
    [bounce.messageId ?? null, account, message.threadId],
  );
  for (const failed of bounce.addresses) {
    await handleDeliveryProblem(
      {
        address: failed.address,
        messageId: sent?.messageId ?? null,
        kind: failed.delayed ? "soft" : "hard",
        reason: failed.reason || failed.status || message.headers.get("subject") || "",
        canReset: true,
        details: { status: failed.status, account },
        gmailMessageId: message.id,
      },
      request,
    );
  }
  return bounce.addresses.length;
}

/** Reads one message: a bounce, a reply to a letter, or something else, left alone; one gone since, skipped. */
async function readMessage(
  account: string,
  token: string,
  id: string,
  read: GmailRead,
  request: Request | undefined,
  keepsThreads: boolean,
) {
  const message = await gmailMessageHeaders(token, id, HEADERS).catch(unlessGone);
  if (!message) return;
  const from = fromAddress(message.headers.get("from")).address;
  if (isBounceSender(from)) {
    read.bounces += await recordBounce(account, token, message, request);
    return;
  }
  const [kept] = await query("SELECT 1 FROM letter_replies WHERE account = $1 AND gmail_message_id = $2", [
    account,
    id,
  ]);
  if (kept || (await isOurLetter(account, message))) return;
  const letterId = await letterAnswered(account, message);
  if (!letterId) {
    if (keepsThreads)
      read.oneOffs =
        (read.oneOffs ?? 0) +
        ((await keepIfPoliticianThread(
          account,
          token,
          message,
          account === process.env.POLICY_INBOX?.toLowerCase(),
        )) === "kept"
          ? 1
          : 0);
    return;
  }
  if (isMachineReply((name) => message.headers.get(name), message.headers.get("subject") ?? "")) {
    if (await noteAutoReply(letterId, message)) read.autoReplies++;
    return;
  }
  await keepReply(account, token, letterId, message);
  read.replies++;
}

/**
 * Reads one account, from where it last got to, and saves where it got to.
 * The letters inbox is read as its own (letters-inbox-reading.ts): all its
 * mail is ours, and its bounces come to it rather than in a thread.
 */
async function readAccount(
  account: string,
  historyId: string,
  keepsThreads: boolean,
  request: Request | undefined,
): Promise<GmailRead> {
  let read: GmailRead = { account, replies: 0, autoReplies: 0, bounces: 0 };
  const token = await gmailAccess(account);
  const letters = account === lettersInbox();
  let history = await gmailHistory(token, historyId);
  if (!history) {
    const { historyId: now } = await gmailProfile(token);
    history = {
      messageIds: await searchGmail(token, letters ? LETTERS_RESTART_SEARCH : RESTART_SEARCH, 500),
      historyId: now,
    };
    read.restarted = true;
  }
  if (letters) {
    read = await readLettersInbox(account, token, history.messageIds, read, request);
  } else {
    const ids = new Set([...history.messageIds, ...(await searchGmail(token, BOUNCE_SEARCH))]);
    for (const id of ids) await readMessage(account, token, id, read, request, keepsThreads);
  }
  await saveHistoryId(account, history.historyId);
  // Its name, as Gmail has it now: renamed since it was connected, or connected before the site kept it.
  await saveGmailName(account, await gmailSendName(token));
  return read;
}

/**
 * Emails the notification inbox, as for an import that failed, for each
 * account this run couldn't read that the run before could: once, until
 * it's read again. Not one Google disconnected, which has an email of its
 * own (gmail-accounts.ts).
 */
async function alertUnreadable(accounts: GmailRead[], request: Request | undefined): Promise<void> {
  const failing = accounts.filter((a) => a.error && !a.disconnected);
  if (!failing.length) return;
  // This run, and the one before it, if any; a run that failed outright has no accounts.
  const [, before] = await query<{ result: { accounts?: GmailRead[] } }>(
    "SELECT result FROM import_runs WHERE job = $1 ORDER BY at DESC, id DESC LIMIT 2",
    [JOB],
  );
  const failedBefore = new Set((before?.result.accounts ?? []).filter((a) => a.error).map((a) => a.account));
  const words = staffCopy.notifications.importFailed;
  const title = jobTitles[JOB];
  for (const { account, error } of failing.filter((a) => !failedBefore.has(a.account))) {
    await notifyStaff(
      words.subject(title),
      words.body(title, `${account}: ${error}`, staffLink(importPath(JOB), request)),
    );
  }
}

/**
 * Emails the notification inbox once, after a run that found mail in the letters
 * inbox it couldn't account for: each message, with a link to it in Gmail,
 * and a link to the runs.
 */
async function alertNotUnderstood(accounts: GmailRead[], request: Request | undefined): Promise<void> {
  const words = staffCopy.lettersInbox;
  const lines = accounts.flatMap((a) =>
    (a.notUnderstood ?? []).map(
      (m) =>
        `- ${m.from}, "${m.subject}": ${words.reasons[m.reason]}. ${gmailMessageLink(a.account, m.gmailMessageId)}`,
    ),
  );
  if (!lines.length) return;
  await notifyStaff(
    words.alert.subject(lines.length, lettersInbox()!),
    words.alert.body(lettersInbox()!, lines, staffLink(importPath(JOB), request)),
  );
}

/**
 * Reads every connected account, keeping the run. One that fails is logged
 * and said so, and the next is read all the same; it's read again from
 * where it got to next time, unless Google refused its access, which
 * disconnects it (gmailAccess). `request` is the job's call, for links in
 * alerts; a staff member's run has none.
 */
export function readGmail(startedBy: string, request?: Request): Promise<GmailReadResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const accounts: GmailRead[] = [];
    for (const { email, historyId, keepsThreads } of await gmailReadingState()) {
      try {
        accounts.push(await readAccount(email, historyId, keepsThreads, request));
      } catch (error) {
        console.error(`Couldn't read ${email}'s Gmail:`, error);
        const disconnected = error instanceof GmailError && error.revoked;
        accounts.push({
          account: email,
          replies: 0,
          autoReplies: 0,
          bounces: 0,
          error: String(error),
          ...(disconnected && { disconnected }),
        });
      }
    }
    const found = accounts.some(
      (a) =>
        a.replies + a.autoReplies + a.bounces > 0 ||
        a.oneOffs ||
        a.relayed ||
        a.spam ||
        a.notUnderstood?.length ||
        a.restarted ||
        a.error,
    );
    await recordRun(JOB, startedBy, found ? "ok" : "unchanged", { accounts });
    await alertNotUnderstood(accounts, request);
    await alertUnreadable(accounts, request);
    await reportUnmatchedMail(gmailAccess);
    return { accounts };
  });
}
