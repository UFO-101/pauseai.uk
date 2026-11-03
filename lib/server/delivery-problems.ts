import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "./db";
import { recordProblem, type DeliveryProblem, type Purpose } from "./email";
import { letterEvent, noticeToSender } from "./letter-sending";
import { notifyStaff, staffLink } from "./notifications";
import { relayBounced } from "./relays";

// What happens when an email bounces or is complained about: the address is
// recorded and, for a hard bounce or complaint, blocked (email.ts), then the
// email's own purpose decides what else to do.

type Sent = { purpose: Purpose; letterId: number | null; rfcMessageId: string | null };

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
 * fixes their address. One from the sender, who's on Cc, says nothing of the
 * letter.
 */
const letterProblem: Hook = async ({ letterId }, problem, request) => {
  const [fromSender] = await query(
    `SELECT 1 FROM letters_from_supporters s JOIN form_entries f ON f.id = s.entry_id
     WHERE s.id = $1 AND lower(trim(f.email)) = lower(trim($2))`,
    [letterId, problem.address],
  );
  if (fromSender) return;
  const mpName = await markLetter(letterId, problem);
  if (!mpName || problem.kind === "soft") return;
  // One from the letters inbox: its sender is told it hasn't reached their MP, in our own words, never the bounce.
  const [proxied] = await query("SELECT 1 FROM letters_from_supporters WHERE id = $1 AND proxy_id IS NOT NULL", [
    letterId,
  ]);
  if (proxied && problem.kind === "hard") await noticeToSender(letterId!, "bounced");
  await alertStaff(mpName, problem, request);
};

/** Tells the notification inbox an MP's address bounced, as nobody can write to them until someone fixes it. */
async function alertStaff(mpName: string, problem: DeliveryProblem, request: Request | undefined) {
  await notifyStaff(
    staffCopy.alert.subject(mpName),
    staffCopy.alert.body(
      mpName,
      problem.address,
      problem.reason,
      staffLink("/staff/politicians/blocked-emails", request),
    ),
  );
}

/**
 * A relay's bounce. One to the MP that bounced hard is marked so, the
 * supporter told and staff alerted, as a letter's is; one to the
 * supporter blocks their address (recordProblem), so later relays to them
 * are held. Either way the letter's history says so; a soft bounce is
 * only noted, as Gmail keeps trying.
 */
const relayProblem: Hook = async ({ letterId, rfcMessageId }, problem, request) => {
  const [toMp] = await query<{ id: number; mpName: string }>(
    `SELECT r.id::int AS id, n.name AS "mpName" FROM letter_relays r JOIN letters l ON l.id = r.letter_id
       JOIN notable_people n ON n.id = l.notable_person_id
     WHERE r.rfc_message_id = $1 AND NOT r.to_supporter`,
    [rfcMessageId],
  );
  await letterEvent(letterId!, problem.kind === "soft" ? "relay_delayed" : "relay_bounced", {
    email: problem.address,
    reason: problem.reason,
  });
  if (!toMp || problem.kind === "soft") return;
  await relayBounced(toMp.id, letterId!);
  await alertStaff(toMp.mpName, problem, request);
};

/** The supporter's copy bounced: their address is blocked (recordProblem), and the history says so. */
const copyProblem: Hook = async ({ letterId }, problem) => {
  await letterEvent(letterId!, problem.kind === "soft" ? "copy_delayed" : "copy_bounced", {
    email: problem.address,
    reason: problem.reason,
  });
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
  "letter-copy": copyProblem,
  relay: relayProblem,
  "supporter-notice": nothing,
  // An MP's address bouncing it is blocked, as any is; the letter's own bounce has told everyone else.
  "office-notice": nothing,
  mailing: mailingProblem,
  "forwarded-reply": nothing,
  "staff-login": nothing,
  "staff-alert": nothing,
  "staff-report": nothing,
  "mailing-test": nothing,
};

/**
 * Records a bounce or complaint, then hands it to the purpose of the email
 * it was about, if we sent it. `request` is the call that brought it,
 * Postmark's webhook or the job that reads Gmail, for staffLink(); none when
 * staff read Gmail from its page.
 */
export async function handleDeliveryProblem(problem: DeliveryProblem, request?: Request): Promise<void> {
  await recordProblem(problem);
  const [sent] = await query<Sent>(
    `SELECT purpose, letter_id::int AS "letterId", rfc_message_id AS "rfcMessageId" FROM email_sends WHERE message_id = $1`,
    [problem.messageId],
  );
  if (sent) await HOOKS[sent.purpose](sent, problem, request);
}
