import "server-only";
import { gzipSync } from "node:zlib";
import { query } from "./db";
import { handleDeliveryProblem } from "./delivery-problems";
import { gmailAccess, gmailReadingState, saveGmailName, saveHistoryId } from "./gmail-accounts";
import { allParts, fromAddress, messageIds, parseHeaders, parseMime, partText, type MimePart } from "./mime";
import { saveLetterReply } from "./outside-services/blobs";
import {
  gmailHistory,
  gmailMessageHeaders,
  gmailProfile,
  gmailRawMessage,
  gmailSendName,
  searchGmail,
  type GmailMessageHeaders,
} from "./outside-services/gmail";
import { isMachineReply } from "./postmark-webhooks";

// Reading the connected Gmail accounts, hourly: the replies to PauseAI's
// letters and the bounces of them. For each message that arrived since the
// last read, the site fetches only the few headers that say what it
// answers; it fetches whole only the messages in our letters' threads, and
// bounces. A politician's reply, or our answer to it, is kept whole
// (letter_replies, and the message in Netlify Blobs); an automatic reply is
// only noted on the letter; a bounce is recorded as Postmark's are.

/** The headers that say what a message is and what it answers. */
const HEADERS = [
  "From",
  "Subject",
  "Message-ID",
  "In-Reply-To",
  "References",
  "Auto-Submitted",
  "X-Autoreply",
  "X-Autorespond",
  "Precedence",
];

/**
 * Bounces from another server than Gmail's may not be in the letter's
 * thread, or name it, so they're also searched for, as far back as a
 * bounce can come late.
 */
const BOUNCE_SEARCH = "from:mailer-daemon OR from:postmaster newer_than:3d";

/** When the mailbox's history has gone, what's searched instead, to miss nothing since the last read. */
const RESTART_SEARCH = "newer_than:3d";

/** What reading one account found. */
export type GmailRead = {
  account: string;
  replies: number;
  autoReplies: number;
  bounces: number;
  /** The mailbox's history had gone, so it was searched instead. */
  restarted?: boolean;
  error?: string;
};

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
       SELECT letter_id, 1 AS rank FROM email_sends WHERE purpose = 'mailing' AND rfc_message_id = ANY($1)
       UNION ALL SELECT letter_id, 2 FROM letter_replies WHERE rfc_message_id = ANY($1)
       UNION ALL SELECT letter_id, 3 FROM email_sends WHERE purpose = 'mailing' AND sender = $2 AND gmail_thread_id = $3
       UNION ALL SELECT letter_id, 4 FROM letter_replies WHERE account = $2 AND gmail_thread_id = $3
     ) found WHERE letter_id IS NOT NULL ORDER BY rank LIMIT 1`,
    [refs, account, message.threadId],
  );
  return row?.letterId;
}

/** Whether a message is one we sent as a letter, which the mailbox has in Sent. */
async function isOurLetter(message: GmailMessageHeaders): Promise<boolean> {
  const [id] = messageIds(message.headers.get("message-id"));
  if (!id) return false;
  const [row] = await query("SELECT 1 FROM email_sends WHERE rfc_message_id = $1", [id]);
  return !!row;
}

/** Keeps a message in a letter's thread whole, and marks the letter replied to if the politician wrote it. */
async function keepReply(
  account: string,
  token: string,
  letterId: number,
  message: GmailMessageHeaders,
): Promise<void> {
  const raw = await gmailRawMessage(token, message.id);
  const from = fromAddress(message.headers.get("from"));
  const fromUs = from.address === account;
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
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'replied', $2)", [
    letterId,
    JSON.stringify({ from: from.address, name: from.name, gmailMessageId: message.id }),
  ]);
}

/** Notes an automatic reply on its letter, once. */
async function noteAutoReply(letterId: number, message: GmailMessageHeaders): Promise<boolean> {
  const [seen] = await query(
    "SELECT 1 FROM letter_events WHERE letter_id = $1 AND status = 'auto_reply' AND details->>'gmailMessageId' = $2",
    [letterId, message.id],
  );
  if (seen) return false;
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'auto_reply', $2)", [
    letterId,
    JSON.stringify({ from: fromAddress(message.headers.get("from")).address, gmailMessageId: message.id }),
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
  request: Request,
): Promise<number> {
  const [seen] = await query("SELECT 1 FROM email_problems WHERE gmail_message_id = $1", [message.id]);
  if (seen) return 0;
  const bounce = readBounce((await gmailRawMessage(token, message.id)).toString("latin1"));
  const [sent] = await query<{ messageId: string }>(
    `SELECT message_id AS "messageId" FROM email_sends WHERE rfc_message_id = $1 AND outcome = 'sent'`,
    [bounce.messageId ?? null],
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

/** Reads one message: a bounce, a reply to a letter, or something else, left alone. */
async function readMessage(account: string, token: string, id: string, read: GmailRead, request: Request) {
  const message = await gmailMessageHeaders(token, id, HEADERS);
  const from = fromAddress(message.headers.get("from")).address;
  if (isBounceSender(from)) {
    read.bounces += await recordBounce(account, token, message, request);
    return;
  }
  const [kept] = await query("SELECT 1 FROM letter_replies WHERE account = $1 AND gmail_message_id = $2", [
    account,
    id,
  ]);
  if (kept || (await isOurLetter(message))) return;
  const letterId = await letterAnswered(account, message);
  if (!letterId) return;
  if (isMachineReply((name) => message.headers.get(name), message.headers.get("subject") ?? "")) {
    if (await noteAutoReply(letterId, message)) read.autoReplies++;
    return;
  }
  await keepReply(account, token, letterId, message);
  read.replies++;
}

/** Reads one account, from where it last got to, and saves where it got to. */
async function readAccount(account: string, historyId: string, request: Request): Promise<GmailRead> {
  const read: GmailRead = { account, replies: 0, autoReplies: 0, bounces: 0 };
  const token = await gmailAccess(account);
  let history = await gmailHistory(token, historyId);
  if (!history) {
    const { historyId: now } = await gmailProfile(token);
    history = { messageIds: await searchGmail(token, RESTART_SEARCH, 500), historyId: now };
    read.restarted = true;
  }
  const ids = new Set([...history.messageIds, ...(await searchGmail(token, BOUNCE_SEARCH))]);
  for (const id of ids) await readMessage(account, token, id, read, request);
  await saveHistoryId(account, history.historyId);
  // Its name, as Gmail has it now: renamed since it was connected, or connected before the site kept it.
  await saveGmailName(account, await gmailSendName(token));
  return read;
}

/**
 * Reads every connected account. One that fails is logged and said so,
 * and the next is read all the same; it's read again from where it got to
 * next time. `request` is the job's call, for links in alerts.
 */
export async function readGmail(request: Request): Promise<GmailRead[]> {
  const reads: GmailRead[] = [];
  for (const { email, historyId } of await gmailReadingState()) {
    try {
      reads.push(await readAccount(email, historyId, request));
    } catch (error) {
      console.error(`Couldn't read ${email}'s Gmail:`, error);
      reads.push({ account: email, replies: 0, autoReplies: 0, bounces: 0, error: String(error) });
    }
  }
  return reads;
}
