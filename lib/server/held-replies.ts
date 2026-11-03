import "server-only";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { now } from "@/lib/now";
import { query } from "./db";
import { isBlocked, send, sentBy } from "./email";
import { cannotSend, letterEvent, lettersBackend, outgoingLetter, threading } from "./letter-sending";
import { notifyStaff, staffLink } from "./notifications";
import { mpName, nameLine, proxyLine } from "./proxies";

// What happens when an MP's office replies to a supporter whose own address
// bounces: the reply is kept, and its relay held (relays.ts), in case staff
// unblock the address. A day on, if it's still held, the office is told,
// once for each letter, as a bounce would have told them. And once a day
// at most, the notification inbox hears how many supporters' addresses
// bounced, and why, to see whether the form should check addresses harder.

/** How long a reply to a supporter is held before their MP's office is told it can't be passed on. */
const HELD_DAYS = 1;

/** The subject of an answer to `subject`: "Re: " before it, unless it has one. */
const answering = (subject: string) => (/^re:/i.test(subject) ? subject : `Re: ${subject}`);

/**
 * Tells the MP's office of each letter whose reply has been held HELD_DAYS
 * for the supporter's blocked address, and whose office hasn't been told:
 * one short email from the supporter's proxy, in the thread of the first
 * reply held, while the letters inbox can send.
 */
export async function tellOfficesOfHeldReplies(): Promise<void> {
  const held = await query<{ letterId: number; messageId: string | null; gmailMessageId: string; subject: string }>(
    `SELECT DISTINCT ON (r.letter_id) r.letter_id::int AS "letterId", m.rfc_message_id AS "messageId",
       m.gmail_message_id AS "gmailMessageId", m.subject
     FROM letter_relays r JOIN letter_replies m ON m.id = r.reply_id
     WHERE r.status = 'held' AND r.reason = 'blocked' AND r.to_supporter
       AND r.created_at < now() - interval '${HELD_DAYS} days'
       AND NOT EXISTS (SELECT 1 FROM letter_events e WHERE e.letter_id = r.letter_id AND e.status = 'office_told')
     ORDER BY r.letter_id, r.created_at, r.id`,
  );
  for (const { letterId, messageId, gmailMessageId, subject } of held) {
    if (await cannotSend(1)) return;
    const letter = (await outgoingLetter(letterId))!;
    if (!letter.mpEmail || (await isBlocked(letter.mpEmail))) continue;
    const to = nameLine(mpName(letter.mpName), letter.mpEmail);
    const result = await send(
      {
        From: proxyLine(letter.senderName, letter.supporterTag),
        To: to,
        Subject: answering(subject),
        TextBody: copy.notices.office(letter.senderName),
        Headers: threading(messageId ?? undefined),
      },
      "office-notice",
      letterId,
      { backend: lettersBackend() },
    );
    // Naming the reply, so the letter's history shows it under that.
    if (result.sent) {
      await letterEvent(letterId, "office_told", { to: letter.mpEmail, gmailMessageId, ...sentBy(result.backend) });
    }
  }
}

const DAY = 24 * 60 * 60 * 1000;

/** The domain of `address`, all an email to staff about it says of it. */
const domainOf = (address: string) => address.slice(address.lastIndexOf("@") + 1).toLowerCase();

/**
 * Emails the notification inbox, at most once a day, how many supporters'
 * copies of their letters bounced since it last did (or in the last day),
 * how many replies to them are held, and each address's domain and what
 * its server said. Nothing when none bounced.
 */
export async function reportSupporterBounces(request: Request | undefined): Promise<void> {
  const [{ last }] = await query<{ last: Date | null }>(
    "SELECT max(at) AS last FROM email_sends WHERE purpose = 'staff-report' AND outcome = 'sent'",
  );
  const dayAgo = new Date(now().getTime() - DAY);
  if (last && last > dayAgo) return;
  const since = last ?? dayAgo;
  const bounced = await query<{ email: string; reason: string }>(
    `SELECT details->>'email' AS email, details->>'reason' AS reason FROM letter_events
     WHERE status = 'copy_bounced' AND at > $1 ORDER BY at, id`,
    [since],
  );
  if (!bounced.length) return;
  const [{ held }] = await query<{ held: number }>(
    "SELECT count(*)::int AS held FROM letter_relays WHERE status = 'held' AND reason = 'blocked' AND to_supporter",
  );
  const words = staffCopy.notifications.supporterBounces;
  await notifyStaff(
    words.subject(bounced.length),
    words.body(
      bounced.length,
      held,
      bounced.map(({ email, reason }) => `- ${domainOf(email)}: ${reason}`),
      staffLink("/staff/supporters/blocked-emails", request),
    ),
    null,
    "staff-report",
  );
}
