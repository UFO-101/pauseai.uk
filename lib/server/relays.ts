import "server-only";
import { gunzipSync } from "node:zlib";
import { query } from "./db";
import { isBlocked, send, sentBy } from "./email";
import {
  cannotSend,
  letterEvent,
  lettersBackend,
  noticeToSender,
  outgoingLetter,
  sendCopy,
  sendLetter,
  sentMessageId,
  type QueueReason,
} from "./letter-sending";
import { isLettersInboxAddress } from "./letters-inbox";
import { relayMime } from "./mime";
import { letterReply } from "./outside-services/blobs";
import { mpName, nameLine, proxyLine } from "./proxies";

// Relays: each message the MP's office or the supporter sends through a
// proxy, kept whole (letter_replies), sent on to the other side from the
// sender's proxy. The same message, byte for byte: its subject and MIME
// body, with only the headers ours (relayMime). Recorded as sending before
// it goes and sent after, so a run that stops between the two leaves it
// uncertain, for a person to check, rather than sending it twice.

/** The most relays a letter has in an hour and in a day, so a loop of automatic replies stops after a few. */
export const RELAY_CAP = { hour: 5, day: 20 };

/** Whether a letter has had as many relays as RELAY_CAP allows, in the last hour or day. */
export async function overRelayCap(letterId: number): Promise<boolean> {
  const [{ hour, day }] = await query<{ hour: number; day: number }>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hour, count(*)::int AS day
     FROM letter_relays WHERE letter_id = $1 AND created_at > now() - interval '1 day'`,
    [letterId],
  );
  return hour >= RELAY_CAP.hour || day >= RELAY_CAP.day;
}

/** A relay's history event: `status`, with whom it's to and the message it relays. */
async function relayEvent(relayId: number, status: string, details: object = {}) {
  const [relay] = await query<{ letterId: number; gmailMessageId: string }>(
    `SELECT r.letter_id::int AS "letterId", m.gmail_message_id AS "gmailMessageId"
     FROM letter_relays r JOIN letter_replies m ON m.id = r.reply_id WHERE r.id = $1`,
    [relayId],
  );
  await letterEvent(relay.letterId, status, { ...details, gmailMessageId: relay.gmailMessageId });
}

async function setStatus(relayId: number, status: string, reason: string | null = null) {
  await query("UPDATE letter_relays SET status = $2, reason = $3 WHERE id = $1", [relayId, status, reason]);
}

/** Puts a relay back in the queue, saying why in the history unless it was waiting for the same reason. */
async function requeue(relayId: number, to: string, reason: QueueReason, was: string | null) {
  await setStatus(relayId, "queued", reason);
  if (was !== reason) await relayEvent(relayId, "relay_queued", { to, reason });
  return { sent: false as const, reason };
}

/**
 * Sends a queued relay: to the supporter from their MP's proxy, joining
 * the thread of their copy; or to the MP's address as it is now from the
 * supporter's proxy, naming the letter. Held while the address it's to is
 * blocked; left queued while the letters inbox can't send. Says whether it
 * went.
 */
export async function sendRelay(relayId: number): Promise<{ sent: boolean; reason?: QueueReason }> {
  const [relay] = await query<{
    letterId: number;
    toSupporter: boolean;
    blobKey: string;
    reason: string | null;
    autoReply: boolean;
  }>(
    `UPDATE letter_relays r SET status = 'sending' FROM letter_replies m
     WHERE r.id = $1 AND r.status = 'queued' AND m.id = r.reply_id
     RETURNING r.letter_id::int AS "letterId", r.to_supporter AS "toSupporter", m.blob_key AS "blobKey", r.reason,
       (SELECT 1 FROM letter_events e WHERE e.letter_id = r.letter_id AND e.status = 'auto_reply'
        AND e.details->>'gmailMessageId' = m.gmail_message_id) IS NOT NULL AS "autoReply"`,
    [relayId],
  );
  if (!relay) return { sent: false };
  const letter = (await outgoingLetter(relay.letterId))!;
  const [from, to, toName, thread] = relay.toSupporter
    ? [proxyLine(mpName(letter.mpName), letter.mpTag), letter.senderEmail, letter.senderName, "letter-copy" as const]
    : [
        proxyLine(letter.senderName, letter.supporterTag),
        letter.mpEmail ?? "",
        mpName(letter.mpName),
        "letter" as const,
      ];
  const toLine = nameLine(toName, to);
  if (!to || isLettersInboxAddress(to) || (await isBlocked(to))) {
    await setStatus(relayId, "held", "blocked");
    await relayEvent(relayId, "relay_held", { to, reason: "blocked" });
    return { sent: false, reason: "blocked" };
  }
  const full = await cannotSend(1);
  if (full) return requeue(relayId, to, full, relay.reason);
  const original = gunzipSync((await letterReply(relay.blobKey))!);
  const references = await sentMessageId(relay.letterId, thread);
  const result = await send({ From: from, To: toLine, Subject: "", TextBody: "" }, "relay", relay.letterId, {
    backend: lettersBackend(),
    raw: (messageId, date) =>
      relayMime(original, [
        ["From", from],
        ["To", toLine],
        ["Date", date.toUTCString()],
        ["Message-ID", `<${messageId}>`],
        ...(references
          ? ([
              ["In-Reply-To", `<${references}>`],
              ["References", `<${references}>`],
            ] as [string, string][])
          : []),
      ]),
  });
  // A block found only as it went is one the next try finds first.
  if (!result.sent) return requeue(relayId, to, "failed", relay.reason);
  await query(
    "UPDATE letter_relays SET status = 'sent', reason = NULL, sent_at = now(), rfc_message_id = $2 WHERE id = $1",
    [relayId, result.messageId],
  );
  await relayEvent(relayId, "relayed", { from, to, messageId: result.messageId, ...sentBy(result.backend) });
  return { sent: true };
}

/**
 * Records a relay of a kept message, to the supporter or to the MP, and
 * sends it at once if it can. Returns its ID.
 */
export async function relay(letterId: number, replyId: number, toSupporter: boolean): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO letter_relays (letter_id, reply_id, to_supporter, status) VALUES ($1, $2, $3, 'queued')
     RETURNING id::int AS id`,
    [letterId, replyId, toSupporter],
  );
  await sendRelay(id);
  return id;
}

/**
 * Marks as uncertain each relay a run left sending, as it may have gone,
 * or not: a person checks, as sending it again could send it twice.
 * Only those left a while, so a run going now isn't caught.
 */
export async function uncertainRelays(): Promise<number> {
  const left = await query<{ id: number }>(
    `UPDATE letter_relays SET status = 'uncertain' WHERE status = 'sending' AND created_at < now() - interval '15 minutes'
     RETURNING id::int AS id`,
  );
  for (const { id } of left) await relayEvent(id, "relay_uncertain");
  return left.length;
}

/** After a bounce of relay `relayId` to the MP: marks it bounced, and tells the supporter. */
export async function relayBounced(relayId: number, letterId: number): Promise<void> {
  await setStatus(relayId, "bounced");
  await noticeToSender(letterId, "bounced");
}

/**
 * Once an address works again (staff unblocked it, or an MP's changed):
 * every letter and relay to the MP at `address`, or to `politicianId`,
 * that bounced, or waits on the block, goes back in the queue and is sent,
 * to the address the MP has now; the supporter is told once it has gone,
 * if they were told it bounced. Copies and relays to a supporter at
 * `address` held for the block go too.
 */
export async function resendAfterFix(fix: { address?: string; politicianId?: number }): Promise<void> {
  const params = [fix.address?.toLowerCase() ?? null, fix.politicianId ?? null];
  const toMp = "(lower(n.email) = $1 OR n.id = $2)";
  const toSupporter = "lower(btrim(f.email)) = $1";
  const FROM = `letters l JOIN letters_from_supporters s USING (id) JOIN notable_people n ON n.id = l.notable_person_id
    JOIN form_entries f ON f.id = s.entry_id`;
  await query(
    `UPDATE letters_from_supporters SET copy_state = 'queued'
     WHERE copy_state = 'held' AND id IN (SELECT l.id FROM ${FROM} WHERE ${toSupporter})`,
    [params[0]],
  );
  const letters = await query<{ id: number; told: boolean }>(
    `SELECT l.id::int AS id, EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = l.id AND e.status = 'notice'
       AND e.details->>'notice' = 'bounced') AS told
     FROM ${FROM} WHERE s.proxy_id IS NOT NULL AND l.status IN ('bounced', 'queued') AND ${toMp} ORDER BY l.id`,
    params,
  );
  for (const letter of letters) {
    await query("UPDATE letters SET status = 'queued' WHERE id = $1", [letter.id]);
    const sent = await sendLetter(letter.id);
    if (sent.sent && letter.told) await noticeToSender(letter.id, "resent");
  }
  const copies = await query<{ id: number }>(
    `SELECT l.id::int AS id FROM ${FROM} WHERE s.copy_state = 'queued' AND l.status = 'sent' AND ${toSupporter}`,
    [params[0]],
  );
  for (const { id } of copies) await sendCopy(id);
  const relays = await query<{ id: number; letterId: number; status: string }>(
    `SELECT r.id::int AS id, r.letter_id::int AS "letterId", r.status
     FROM letter_relays r JOIN ${FROM} ON l.id = r.letter_id
     WHERE r.status IN ('bounced', 'held') AND ((NOT r.to_supporter AND ${toMp}) OR (r.to_supporter AND ${toSupporter}))
     ORDER BY r.id`,
    params,
  );
  for (const each of relays) {
    await setStatus(each.id, "queued");
    const sent = await sendRelay(each.id);
    if (sent.sent && each.status === "bounced") await noticeToSender(each.letterId, "resent");
  }
}
