import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { copy } from "@/lib/content/email-your-mp";
import { campaignBySlug } from "@/lib/email-your-mp";
import { checkDoc, toHtml, toText } from "@/lib/letter-format";
import { query } from "./db";
import { isBlocked, send, sentBy, type Backend, type Purpose } from "./email";
import { gmailAccount, sentToday } from "./gmail-accounts";
import { LETTERS_DAILY_LIMIT, lettersInbox } from "./letters-inbox";
import { staffCopy } from "@/lib/content/staff-interface";
import { reportSupporterBounces, tellOfficesOfHeldReplies } from "./held-replies";
import { notifyStaff, staffLink } from "./notifications";
import { mpName, nameLine, proxyLine } from "./proxies";
import { resendAfterFix, sendRelay, uncertainRelays } from "./relays";
import { problem } from "./problems";

// Supporters' letters to MPs, sent from the letters inbox
// (lib/server/letters-inbox.ts): the letter, from the supporter's proxy to
// the MP's address, then the supporter's copy, from their proxy to them,
// with Reply-To the MP's proxy, so replying to it reaches only our proxies. Once a
// letter passes the form's checks it's kept, queued, and never deleted for
// failing to send: the request tries at once, and whatever stops it waits,
// with its reason, for the hourly run (sendLetterQueue), or, for a blocked
// MP's address, for staff to fix it.

/**
 * Why a letter, a copy or a relay waits: the letters inbox isn't
 * connected, it's at its daily limit, Gmail refused or couldn't be
 * reached, or the address it's to is blocked.
 */
export type QueueReason = "not_connected" | "daily_limit" | "failed" | "blocked";

/** What a letter needs to go, from its rows: who it's from and to, by name, address and proxy, and what it says. */
export type OutgoingLetter = {
  id: number;
  status: string;
  copyState: string;
  campaign: string;
  subject: string;
  letter: unknown;
  senderName: string;
  senderEmail: string;
  supporterTag: string;
  mpName: string;
  mpEmail: string | null;
  mpTag: string;
};

/** A letter sent from the letters inbox, by its ID. */
export async function outgoingLetter(id: number): Promise<OutgoingLetter | undefined> {
  const [row] = await query<OutgoingLetter>(
    `SELECT l.id::int AS id, l.status, s.copy_state AS "copyState", s.campaign, s.subject, s.letter,
       f.name AS "senderName", f.email AS "senderEmail", sp.tag AS "supporterTag",
       n.name AS "mpName", n.email AS "mpEmail", mp.tag AS "mpTag"
     FROM letters_from_supporters s JOIN letters l USING (id) JOIN form_entries f ON f.id = s.entry_id
       JOIN proxies sp ON sp.id = s.proxy_id JOIN notable_people n ON n.id = l.notable_person_id
       JOIN proxies mp ON mp.notable_person_id = n.id
     WHERE l.id = $1`,
    [id],
  );
  return row;
}

/** The letters inbox as send() takes it. */
export function lettersBackend(): Backend {
  return { name: "gmail", account: lettersInbox()! };
}

/** Why the letters inbox can't send `count` more emails now, if it can't. */
export async function cannotSend(count: number): Promise<QueueReason | undefined> {
  const inbox = lettersInbox();
  if (!inbox || !(await gmailAccount(inbox))) return "not_connected";
  if ((await sentToday(inbox)) + count > LETTERS_DAILY_LIMIT) return "daily_limit";
  return undefined;
}

/** Adds an event to a letter's history. */
export async function letterEvent(letterId: number, status: string, details: object = {}): Promise<void> {
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [
    letterId,
    status,
    JSON.stringify(details),
  ]);
}

/** The Message-ID a letter's email of `purpose` went with, if it went. */
export async function sentMessageId(letterId: number, purpose: Purpose): Promise<string | undefined> {
  const [row] = await query<{ id: string }>(
    `SELECT rfc_message_id AS id FROM email_sends
     WHERE letter_id = $1 AND purpose = $2 AND outcome = 'sent' AND rfc_message_id IS NOT NULL ORDER BY id DESC LIMIT 1`,
    [letterId, purpose],
  );
  return row?.id;
}

/** In-Reply-To and References naming `messageId`, so an email joins its thread; none without one. */
export function threading(messageId: string | undefined) {
  return messageId ? ["In-Reply-To", "References"].map((Name) => ({ Name, Value: `<${messageId}>` })) : undefined;
}

async function attachments(campaignSlug: string) {
  const campaign = campaignBySlug(campaignSlug)!;
  return Promise.all(
    campaign.attachments.map(async ({ file }) => ({
      Name: file,
      Content: (await readFile(join(process.cwd(), "public", "pdfs", file))).toString("base64"),
      ContentType: "application/pdf",
    })),
  );
}

/** Puts a letter back in the queue, saying why in its history unless it already said so last. */
async function requeue(letterId: number, reason: QueueReason): Promise<{ sent: false; reason: QueueReason }> {
  await query("UPDATE letters SET status = 'queued' WHERE id = $1", [letterId]);
  const [last] = await query<{ status: string; reason: string | null }>(
    `SELECT status, details->>'reason' AS reason FROM letter_events WHERE letter_id = $1 ORDER BY at DESC, id DESC LIMIT 1`,
    [letterId],
  );
  if (last?.status !== "queued" || last.reason !== reason) await letterEvent(letterId, "queued", { reason });
  return { sent: false, reason };
}

/**
 * Sends a queued letter, then its copy: to the MP's address as it is now,
 * which may have changed since it was written. Takes the letter first, so
 * a run that's sending it too doesn't. Says whether it went, or why not.
 */
export async function sendLetter(id: number): Promise<{ sent: true } | { sent: false; reason: QueueReason }> {
  const [taken] = await query(
    "UPDATE letters SET status = 'sending' WHERE id = $1 AND status = 'queued' RETURNING id",
    [id],
  );
  if (!taken) return { sent: true };
  try {
    return await sendTaken(id);
  } catch (error) {
    // Kept, and back in the queue, so the next run tries again; whoever wrote it is told it's on its way.
    problem(staffCopy.problems.anywhere.letterNotSent(id), error);
    return requeue(id, "failed");
  }
}

/** Sends a letter sendLetter has taken. */
async function sendTaken(id: number): Promise<{ sent: true } | { sent: false; reason: QueueReason }> {
  const letter = (await outgoingLetter(id))!;
  if (!letter.mpEmail || (await isBlocked(letter.mpEmail))) return requeue(id, "blocked");
  // Room for the copy too, so the two go together.
  const full = await cannotSend(2);
  if (full) return requeue(id, full);
  const doc = checkDoc(letter.letter)!;
  const from = proxyLine(letter.senderName, letter.supporterTag);
  const result = await send(
    {
      From: from,
      To: nameLine(mpName(letter.mpName), letter.mpEmail),
      Subject: letter.subject,
      TextBody: toText(doc),
      HtmlBody: toHtml(doc),
      Attachments: await attachments(letter.campaign),
    },
    "letter",
    id,
    { backend: lettersBackend() },
  );
  // A block found only as it went is one the next try finds first.
  if (!result.sent) return requeue(id, "failed");
  await query("UPDATE letters SET status = 'sent', sent_at = now() WHERE id = $1", [id]);
  await letterEvent(id, "sent", { from, to: letter.mpEmail, messageId: result.messageId, ...sentBy(result.backend) });
  await sendCopy(id);
  return { sent: true };
}

/**
 * Sends the supporter their copy of a letter that has gone: the letter,
 * with a line above it saying what it is, from their proxy to them, by
 * name, with Reply-To their MP's proxy, so Reply and Reply all reach the
 * MP through us. Addressed to them, not Bcc'd: mail they're only Bcc'd on
 * is more likely to be filed as junk. Held while their address is
 * blocked; left queued while the letters inbox can't send.
 */
export async function sendCopy(id: number): Promise<void> {
  const [taken] = await query(
    `UPDATE letters_from_supporters s SET copy_state = 'sending' FROM letters l
     WHERE s.id = $1 AND l.id = s.id AND l.status = 'sent' AND s.copy_state = 'queued' RETURNING s.id`,
    [id],
  );
  if (!taken) return;
  const letter = (await outgoingLetter(id))!;
  const state = async (copyState: string) =>
    query("UPDATE letters_from_supporters SET copy_state = $2 WHERE id = $1", [id, copyState]);
  if (await isBlocked(letter.senderEmail)) {
    await state("held");
    await letterEvent(id, "copy_held", { to: letter.senderEmail, reason: "blocked" });
    return;
  }
  if (await cannotSend(1)) return void (await state("queued"));
  const doc = checkDoc(letter.letter)!;
  const line = copy.letterCopy(mpName(letter.mpName));
  const from = proxyLine(letter.senderName, letter.supporterTag);
  const replyTo = proxyLine(mpName(letter.mpName), letter.mpTag);
  const result = await send(
    {
      From: from,
      To: nameLine(letter.senderName, letter.senderEmail),
      ReplyTo: replyTo,
      Subject: letter.subject,
      // The line set apart from the letter: italic and grey, over a rule; in plain text, over a dash.
      TextBody: `${line}\n—\n\n${toText(doc)}`,
      HtmlBody: `<p style="color:#666666"><em>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</em></p><hr style="border:0;border-top:1px solid #dddddd">${toHtml(doc)}`,
      Attachments: await attachments(letter.campaign),
    },
    "letter-copy",
    id,
    { backend: lettersBackend() },
  );
  if (!result.sent) return void (await state("queued"));
  await state("sent");
  await letterEvent(id, "copy_sent", {
    from,
    to: letter.senderEmail,
    replyTo,
    messageId: result.messageId,
    ...sentBy(result.backend),
  });
}

/**
 * Our own short email to a letter's sender, `notice` of copy.notices, from
 * the letters inbox's own address as "PauseAI", in the thread of their
 * copy. Says whether it went.
 */
export async function noticeToSender(letterId: number, notice: "bounced" | "resent"): Promise<boolean> {
  const letter = await outgoingLetter(letterId);
  if (!letter || (await cannotSend(1))) return false;
  const result = await send(
    {
      From: `"PauseAI" <${lettersInbox()}>`,
      To: nameLine(letter.senderName, letter.senderEmail),
      Subject: `Re: ${letter.subject}`,
      TextBody: copy.notices[notice](mpName(letter.mpName)),
      Headers: threading(await sentMessageId(letterId, "letter-copy")),
    },
    "supporter-notice",
    letterId,
    { backend: lettersBackend() },
  );
  if (result.sent) await letterEvent(letterId, "notice", { to: letter.senderEmail, notice, ...sentBy(result.backend) });
  return result.sent;
}

/**
 * Sends again what bounced to an MP whose address has changed since: each
 * letter or relay to them that bounced, once their address is one that
 * isn't blocked and isn't the one it bounced from (resendAfterFix).
 */
async function resendToChangedAddresses(): Promise<void> {
  const changed = await query<{ id: number }>(
    `SELECT DISTINCT n.id::int AS id FROM notable_people n JOIN letters l ON l.notable_person_id = n.id
     WHERE n.email IS NOT NULL AND NOT EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(n.email))
       AND (EXISTS (SELECT 1 FROM letters_from_supporters s JOIN email_sends e ON e.letter_id = s.id AND e.purpose = 'letter'
                    WHERE s.id = l.id AND s.proxy_id IS NOT NULL AND l.status = 'bounced' AND e.address <> lower(n.email))
         OR EXISTS (SELECT 1 FROM letter_relays r JOIN email_sends e ON e.rfc_message_id = r.rfc_message_id
                    WHERE r.letter_id = l.id AND r.status = 'bounced' AND NOT r.to_supporter AND e.address <> lower(n.email)))`,
  );
  for (const { id } of changed) await resendAfterFix({ politicianId: id });
}

/**
 * Sends each of `ids` in turn with `send`, while it's before `until` and the
 * letters inbox has room for `room` more. Returns how many `send` says went.
 */
async function drain(ids: number[], until: number, room: number, send: (id: number) => Promise<boolean>) {
  let sent = 0;
  for (const id of ids) {
    if (Date.now() >= until || (await cannotSend(room))) break;
    if (await send(id)) sent++;
  }
  return sent;
}

/** How long a letter to an MP waits to go before the notification inbox is told. */
const LATE_HOURS = 3;

/** The letters waiting to go, oldest first, but those whose MP's address is blocked, which wait for staff. */
const SENDABLE = `SELECT l.id::int AS id FROM letters l JOIN letters_from_supporters s USING (id) JOIN notable_people n ON n.id = l.notable_person_id
     WHERE l.status = 'queued' AND n.email IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM email_blocks b WHERE b.address = lower(n.email))`;

/**
 * Emails the notification inbox when letters have waited LATE_HOURS to go:
 * how many, and why. Once: the email is logged against the oldest, and
 * none goes while a letter it was logged against is still waiting.
 */
async function tellOfLateLetters(request: Request | undefined): Promise<void> {
  const late = await query<{ id: number }>(
    `${SENDABLE} AND l.created_at < now() - interval '${LATE_HOURS} hours' ORDER BY l.created_at, l.id`,
  );
  if (!late.length) return;
  const [told] = await query(
    `SELECT 1 FROM email_sends e JOIN letters l ON l.id = e.letter_id
     WHERE e.purpose = 'staff-alert' AND e.outcome = 'sent' AND l.status = 'queued'`,
  );
  if (told) return;
  const words = staffCopy.notifications.lettersWaiting;
  const why = staffCopy.letters.detail.reasons[(await cannotSend(2)) ?? "failed"];
  await notifyStaff(
    words.subject(late.length, LATE_HOURS),
    words.body(late.length, LATE_HOURS, why, staffLink("/staff/campaigns", request)),
    late[0].id,
  );
}

/** What a run through the queue sent, and what's left in it. */
export type LetterQueueRun = { sent: number; left: number };

/**
 * Works through the letters inbox's queue, until it's `until` (a time in
 * ms): first marking relays a stopped run left sending as uncertain; then
 * relays waiting to be tried again, so an MP's reply is never held up
 * behind new letters; then letters, oldest first; then copies. A letter
 * whose MP's address is still blocked is passed over. Stops when the
 * letters inbox can't send. Then tells the notification inbox if letters
 * have waited too long (tellOfLateLetters), linking from `request`'s site;
 * tells MPs' offices of replies held a day for a supporter's bouncing
 * address; and, once a day, reports how often that happens (held-replies.ts).
 */
export async function sendLetterQueue(until: number, request?: Request): Promise<LetterQueueRun> {
  await uncertainRelays();
  await resendToChangedAddresses();
  const ids = async (sql: string) => (await query<{ id: number }>(sql)).map((row) => row.id);
  const relays = await ids("SELECT id::int AS id FROM letter_relays WHERE status = 'queued' ORDER BY created_at, id");
  let sent = await drain(relays, until, 1, async (id) => (await sendRelay(id)).sent);
  const letters = await ids(`${SENDABLE} ORDER BY l.created_at, l.id`);
  sent += await drain(letters, until, 2, async (id) => (await sendLetter(id)).sent);
  const copies = await ids(
    "SELECT s.id::int AS id FROM letters_from_supporters s JOIN letters l USING (id) WHERE s.copy_state = 'queued' AND l.status = 'sent' ORDER BY s.id",
  );
  await drain(copies, until, 1, async (id) => (await sendCopy(id), false));
  const [{ left }] = await query<{ left: number }>(
    `SELECT (SELECT count(*) FROM letter_relays WHERE status = 'queued')
       + (SELECT count(*) FROM letters WHERE status = 'queued')
       + (SELECT count(*) FROM letters_from_supporters s JOIN letters l USING (id) WHERE s.copy_state = 'queued' AND l.status = 'sent') AS left`,
  );
  await tellOfLateLetters(request);
  await tellOfficesOfHeldReplies();
  await reportSupporterBounces(request);
  return { sent, left: Number(left) };
}
