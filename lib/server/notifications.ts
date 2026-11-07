import "server-only";
import { now } from "@/lib/now";
import { siteUrlIfKnown } from "@/lib/site-url";
import { query } from "./db";
import { send, type Purpose } from "./email";
import { notifyDomain } from "./outside-services/postmark";
import { problem } from "./problems";
import { staffCopy } from "@/lib/content/staff-interface";

// Emails to the notification inbox (NOTIFICATION_INBOX): something on the
// site needs a person. An MP's address bouncing, mail in the letters inbox
// it can't relay, an import failing or held, a Gmail account Google has
// disconnected, letters waiting too long to go. Each is sent once for each
// time it happens, by the code that finds it. Nothing is sent where the
// variable isn't set.

/**
 * The address of `path` on the site, for a link in a notification: from
 * siteUrl(), or where this build can't say, as a Server Action on a local
 * build can't, the path alone.
 */
export function staffLink(path: string, request: Request | undefined): string {
  return siteUrlIfKnown(path, request)?.href ?? path;
}

/**
 * Emails the notification inbox `subject` and `text`, as a staff alert or
 * report (`purpose`), logged against `letterId` if it's about one letter.
 * Says whether it went.
 */
export async function notifyStaff(
  subject: string,
  text: string,
  letterId: number | null = null,
  purpose: Extract<Purpose, "staff-alert" | "staff-report"> = "staff-alert",
): Promise<boolean> {
  const inbox = process.env.NOTIFICATION_INBOX;
  if (!inbox) {
    problem(staffCopy.problems.anywhere.noInbox);
    return false;
  }
  const result = await send(
    {
      From: `PauseAI UK <noreply@${notifyDomain()}>`,
      To: inbox,
      Subject: subject,
      TextBody: text,
      Tag: purpose,
    },
    purpose,
    letterId,
  );
  return result.sent;
}

/** Tells the notification inbox an MP's address bounced, as nobody can write to them until someone fixes it. */
export async function alertBouncedMp(
  mpName: string,
  address: string,
  reason: string,
  request: Request | undefined,
): Promise<void> {
  await notifyStaff(
    staffCopy.alert.subject(mpName),
    staffCopy.alert.body(mpName, address, reason, staffLink("/staff/politicians/blocked-emails", request)),
  );
}

/**
 * Tells the notification inbox of an address just blocked, if it's that of
 * a politician in office, whom the dashboard then shows as waiting on a person.
 */
export async function alertIfPoliticianBlocked(
  address: string,
  reason: string,
  request: Request | undefined,
): Promise<void> {
  const politicians = await query<{ name: string }>(
    "SELECT name FROM notable_people WHERE lower(email) = $1 AND status = 'in_office' ORDER BY id",
    [address],
  );
  const words = staffCopy.alert.notALetter;
  const link = staffLink("/staff/politicians/blocked-emails", request);
  for (const { name } of politicians) await notifyStaff(words.subject(name), words.body(name, address, reason, link));
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Emails the notification inbox, at most once a day, each MP in office whose
 * address has bounced or complained about a mailing's letter since it last
 * did (or in the last day), with what its server said. Nothing when none
 * did. Each problem told of says when in its `details`, so this report keeps
 * its own time, whatever other reports go, and one whose email failed is told
 * of next time.
 */
export async function reportMailingBounces(request: Request | undefined): Promise<void> {
  const at = now();
  const [{ last }] = await query<{ last: Date | null }>(
    "SELECT max((details->>'reportedAt')::timestamptz) AS last FROM email_problems",
  );
  const dayAgo = new Date(at.getTime() - DAY);
  if (last && last > dayAgo) return;
  const bounced = await query<{ id: number; name: string; address: string; reason: string }>(
    `SELECT pr.id::int AS id, n.name, pr.address, pr.reason
     FROM email_problems pr JOIN email_sends e ON e.message_id = pr.message_id AND e.purpose = 'mailing'
       JOIN letters l ON l.id = e.letter_id JOIN notable_people n ON n.id = l.notable_person_id
     WHERE pr.kind <> 'soft' AND n.status = 'in_office' AND pr.at > $1 AND pr.details->>'reportedAt' IS NULL
     ORDER BY pr.at, pr.id`,
    [last ?? dayAgo],
  );
  if (!bounced.length) return;
  const words = staffCopy.notifications.mailingBounces;
  const told = await notifyStaff(
    words.subject(bounced.length),
    words.body(
      bounced.map(({ name, address, reason }) => `- ${name} (${address}): ${reason}`),
      staffLink("/staff/politicians/blocked-emails", request),
    ),
  );
  if (told) {
    await query(
      "UPDATE email_problems SET details = details || jsonb_build_object('reportedAt', $2::text) WHERE id = ANY($1)",
      [bounced.map(({ id }) => id), at.toISOString()],
    );
  }
}
