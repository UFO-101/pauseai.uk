import "server-only";
import { checkMailingDoc, type MailingRecipientValues } from "@/lib/mailing-doc";
import { now } from "@/lib/now";
import { logChange } from "./audit";
import { query } from "./db";
import { isBlocked } from "./email";
import { gmailAccount } from "./gmail-accounts";
import { attachmentsOf, emailFor } from "./mailing-drafts";
import { mailingChannel, type MailingChannel } from "./mailing-channels";

// Sending the mailings that are due: the send-mailings job starts each
// scheduled one whose time has come, then sends its letters one at a
// time, at Gmail's pace, marking each as it goes, so a run that stops
// partway is taken up by the next. Each letter is checked again just
// before it goes: a politician who has left office, or whose address has
// been blocked since, is skipped, and the letter says why.

/** Who the audit log says started a mailing. */
const JOB = "send-mailings";

/** The gap between two sends from one account: Gmail takes 60 a minute. */
const SEND_GAP_MS = 1000;

/** Starts every scheduled mailing that's due. Returns their IDs. */
export async function startDueMailings(): Promise<number[]> {
  const started = await query<{ id: number }>(
    `UPDATE mailings SET state = 'sending', updated_at = now()
     WHERE state = 'scheduled' AND due_at <= $1 RETURNING id::int AS id`,
    [now()],
  );
  for (const { id } of started) await logChange(JOB, "start mailing", { id });
  return started.map(({ id }) => id).sort((a, b) => a - b);
}

/** What a run of sending did, and what's left: letters still to go, and whether an account has reached its limit for the day. */
export type SendingRun = { sent: number; skipped: number; failed: number; left: number; waiting: string[] };

type Mailing = { id: number; subject: string; body: unknown; sentFrom: string; fromName: string };

type Letter = {
  id: number;
  name: string;
  email: string | null;
  inOffice: boolean;
  mergeValues: MailingRecipientValues;
};

/** Takes the next letter of a mailing to send, marking it sending, so no other run sends it too. */
async function nextLetter(mailingId: number): Promise<Letter | undefined> {
  const [letter] = await query<Letter>(
    `UPDATE letters l SET status = 'sending' FROM letters_from_pauseai p, notable_people n
     WHERE l.id = (SELECT l2.id FROM letters l2 JOIN letters_from_pauseai p2 USING (id)
                   WHERE p2.mailing_id = $1 AND l2.status = 'scheduled' ORDER BY l2.id LIMIT 1 FOR UPDATE SKIP LOCKED)
       AND p.id = l.id AND n.id = l.notable_person_id
     RETURNING l.id::int AS id, n.name, n.email, n.status = 'in_office' AS "inOffice", p.merge_values AS "mergeValues"`,
    [mailingId],
  );
  return letter;
}

async function skip(letterId: number, reason: "blocked" | "left-office"): Promise<void> {
  await query("UPDATE letters SET status = 'skipped' WHERE id = $1", [letterId]);
  await query("UPDATE letters_from_pauseai SET skip_reason = $2 WHERE id = $1", [letterId, reason]);
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'skipped', $2)", [
    letterId,
    JSON.stringify({ reason }),
  ]);
}

/** Marks every mailing sending with no letter left to send as sent. */
async function finishMailings(): Promise<void> {
  const finished = await query<{ id: number }>(
    `UPDATE mailings m SET state = 'sent', updated_at = now() WHERE m.state = 'sending' AND NOT EXISTS (
       SELECT 1 FROM letters_from_pauseai p JOIN letters l USING (id)
       WHERE p.mailing_id = m.id AND l.status IN ('scheduled', 'sending'))
     RETURNING m.id::int AS id`,
  );
  for (const { id } of finished) await logChange(JOB, "finish mailing", { id });
}

/** Letters of mailings being sent still to go. */
async function lettersLeft(): Promise<number> {
  const [{ left }] = await query<{ left: number }>(
    `SELECT count(*)::int AS left FROM letters l JOIN letters_from_pauseai p USING (id) JOIN mailings m ON m.id = p.mailing_id
     WHERE m.state = 'sending' AND l.status = 'scheduled'`,
  );
  return left;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends the letters of the mailings being sent, oldest due first, one at a
 * time, `gap` apart, until there are none or it's `until` (a time in ms).
 * An account at its daily limit, or no longer connected, sends no more
 * this run: its letters wait for the next.
 */
export async function sendDueLetters({
  until,
  gap = SEND_GAP_MS,
  channel = mailingChannel("email")!,
}: {
  until: number;
  gap?: number;
  channel?: MailingChannel;
}): Promise<SendingRun> {
  const run: SendingRun = { sent: 0, skipped: 0, failed: 0, left: 0, waiting: [] };
  const mailings = await query<Mailing>(
    // In its From name, or with none the name its Gmail sends as, written into the From line: whether
    // Gmail would fill in a name left out isn't documented, so none is left to it.
    `SELECT m.id::int AS id, m.subject, m.body, m.sent_from AS "sentFrom",
       coalesce(nullif(m.from_name, ''), a.gmail_name, '') AS "fromName"
     FROM mailings m LEFT JOIN staff_accounts a ON a.email = m.sent_from
     WHERE m.state = 'sending' ORDER BY m.due_at, m.id`,
  );
  let last = 0;
  for (const mailing of mailings) {
    if (run.waiting.includes(mailing.sentFrom)) continue;
    const body = checkMailingDoc(mailing.body)!;
    const attachments = await attachmentsOf(mailing.id);
    while (Date.now() + gap < until) {
      const account = await gmailAccount(mailing.sentFrom);
      if (!account || (await channel.remainingToday(mailing.sentFrom))! <= 0) {
        run.waiting.push(mailing.sentFrom);
        break;
      }
      const letter = await nextLetter(mailing.id);
      if (!letter) break;
      if (!letter.inOffice || !letter.email || (await isBlocked(letter.email))) {
        await skip(letter.id, letter.inOffice ? "blocked" : "left-office");
        run.skipped++;
        continue;
      }
      await wait(Math.max(0, last + gap - Date.now()));
      last = Date.now();
      const result = await channel.send(
        {
          from: { name: mailing.fromName, address: mailing.sentFrom },
          to: { name: letter.name, address: letter.email },
          ...emailFor({ subject: mailing.subject, body }, letter.mergeValues),
          attachments,
          letterId: letter.id,
        },
        "mailing",
      );
      if (result.sent) {
        await query("UPDATE letters SET status = 'sent', sent_at = now() WHERE id = $1", [letter.id]);
        await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'sent', $2)", [
          letter.id,
          JSON.stringify({ from: mailing.sentFrom, messageId: result.messageId, threadId: result.threadId }),
        ]);
        run.sent++;
      } else if (result.reason === "blocked") {
        await skip(letter.id, "blocked");
        run.skipped++;
      } else {
        await query("UPDATE letters SET status = 'not_sent' WHERE id = $1", [letter.id]);
        await query("INSERT INTO letter_events (letter_id, status) VALUES ($1, 'failed')", [letter.id]);
        run.failed++;
      }
    }
  }
  await finishMailings();
  return { ...run, left: await lettersLeft() };
}
