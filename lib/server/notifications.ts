import "server-only";
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
  for (const { name } of politicians) await alertBouncedMp(name, address, reason, request);
}
