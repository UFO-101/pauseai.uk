import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { siteUrl } from "@/lib/site-url";
import { query } from "./db";
import { recordProblem, send, type DeliveryProblem, type Purpose } from "./email";
import { notifyDomain } from "./outside-services/postmark";

// What happens when an email bounces or is complained about: the address is
// recorded and, for a hard bounce or complaint, blocked (email.ts), then the
// email's own purpose decides what else to do.

type Sent = { purpose: Purpose; letterId: number | null };

type Hook = (sent: Sent, problem: DeliveryProblem, request: Request | undefined) => Promise<void>;

const nothing: Hook = async () => {};

/** Marks a letter bounced or complained about, with an event saying why. Returns the politician's name. */
async function markLetter(letterId: number | null, problem: DeliveryProblem): Promise<string | undefined> {
  const status = problem.kind === "complaint" ? "spam_complaint" : "bounced";
  const [letter] = await query<{ mpName: string }>(
    `UPDATE letters l SET status = $2 FROM notable_people p WHERE l.id = $1 AND p.id = l.notable_person_id
     RETURNING p.name AS "mpName"`,
    [letterId, status],
  );
  if (!letter) return undefined;
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [
    letterId,
    status,
    JSON.stringify({ ...problem.details, reason: problem.reason, email: problem.address }),
  ]);
  return letter.mpName;
}

/**
 * A letter's bounce or complaint: the letter says so, and for a hard bounce
 * or complaint, staff are told, as the MP can't be written to until someone
 * fixes their address.
 */
const letterProblem: Hook = async ({ letterId }, problem, request) => {
  const mpName = await markLetter(letterId, problem);
  if (!mpName) return;
  const inbox = process.env.POLICY_INBOX;
  if (problem.kind === "soft" || !inbox) return;
  await send(
    {
      From: `PauseAI UK <noreply@${notifyDomain()}>`,
      To: inbox,
      Subject: staffCopy.alert.subject(mpName),
      TextBody: staffCopy.alert.body(
        mpName,
        problem.address,
        problem.reason,
        siteUrl("/staff/politicians/blocked-emails", request).href,
      ),
      Tag: "staff-alert",
    },
    "staff-alert",
  );
};

/**
 * A mailing's letter's bounce: the letter says so. Staff aren't told one
 * at a time, as a mailing goes to many; its page counts them, and the
 * address is on Politicians' blocked emails.
 */
const mailingProblem: Hook = async ({ letterId }, problem) => {
  await markLetter(letterId, problem);
};

const HOOKS: Record<Purpose, Hook> = {
  letter: letterProblem,
  mailing: mailingProblem,
  "forwarded-reply": nothing,
  "staff-login": nothing,
  "staff-alert": nothing,
  "mailing-test": nothing,
};

/**
 * Records a bounce or complaint, then hands it to the purpose of the email
 * it was about, if we sent it. `request` is the call that brought it,
 * Postmark's webhook or the job that reads Gmail, for siteUrl(); none when
 * staff read Gmail from its page.
 */
export async function handleDeliveryProblem(problem: DeliveryProblem, request?: Request): Promise<void> {
  await recordProblem(problem);
  const [sent] = await query<Sent>(
    `SELECT purpose, letter_id::int AS "letterId" FROM email_sends WHERE message_id = $1`,
    [problem.messageId],
  );
  if (sent) await HOOKS[sent.purpose](sent, problem, request);
}
