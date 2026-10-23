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

type Hook = (sent: Sent, problem: DeliveryProblem, request: Request) => Promise<void>;

const nothing: Hook = async () => {};

/**
 * A letter's bounce or complaint: the letter says so, and for a hard bounce
 * or complaint, staff are told, as the MP can't be written to until someone
 * fixes their address.
 */
const letterProblem: Hook = async ({ letterId }, problem, request) => {
  const status = problem.kind === "complaint" ? "spam_complaint" : "bounced";
  const [letter] = await query<{ mpName: string }>(
    `UPDATE letters l SET status = $2 FROM politicians p WHERE l.id = $1 AND p.id = l.politician_id
     RETURNING p.name AS "mpName"`,
    [letterId, status],
  );
  if (!letter) return;
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, $2, $3)", [
    letterId,
    status,
    JSON.stringify({ ...problem.details, reason: problem.reason, email: problem.address }),
  ]);
  const inbox = process.env.REPLIES_INBOX;
  if (problem.kind === "soft" || !inbox) return;
  await send(
    {
      From: `PauseAI UK <noreply@${notifyDomain()}>`,
      To: inbox,
      Subject: staffCopy.alert.subject(letter.mpName),
      TextBody: staffCopy.alert.body(
        letter.mpName,
        problem.address,
        problem.reason,
        siteUrl("/staff/politicians/blocked-emails", request).href,
      ),
      Tag: "staff-alert",
    },
    "staff-alert",
  );
};

const HOOKS: Record<Purpose, Hook> = {
  letter: letterProblem,
  "forwarded-reply": nothing,
  "staff-login": nothing,
  "staff-alert": nothing,
};

/**
 * Records a bounce or complaint, then hands it to the purpose of the email
 * it was about, if we sent it. `request` is Postmark's webhook call, for siteUrl().
 */
export async function handleDeliveryProblem(problem: DeliveryProblem, request: Request): Promise<void> {
  await recordProblem(problem);
  const [sent] = await query<Sent>(
    `SELECT purpose, letter_id::int AS "letterId" FROM email_sends WHERE message_id = $1`,
    [problem.messageId],
  );
  if (sent) await HOOKS[sent.purpose](sent, problem, request);
}
