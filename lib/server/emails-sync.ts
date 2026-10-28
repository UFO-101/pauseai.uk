import "server-only";
import type { EmailSyncResult } from "@/lib/import-runs";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { airtableToken, fetchEmails, fetchTestPoliticianIds } from "./outside-services/airtable";

// Copies PauseAI's emails to politicians from Airtable's Emails table
// into pauseai_letters, nightly (app/api/cron/sync-politicians, after the
// politicians) or when staff ask, each run in the import log as
// "sync-emails". An email is added once, by its record's ID, as a letter of
// the mailing whose tick box is ticked, to the politician it links to; it's
// never changed after. Airtable has no text, Message-ID or thread for it.
// One to a politician ticked Test in Airtable is skipped, as the politicians
// sync skips them. One whose politician isn't here yet waits for the next run. One with no
// box of a known mailing ticked, or several, is held back and reported, not
// guessed at: a new tick box is a new mailings row, added by a migration.

const JOB = "sync-emails";

/** Copies the emails not copied yet, keeping the run. `startedBy` is NIGHTLY or the staff member's email. */
export function syncEmails(startedBy: string): Promise<EmailSyncResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const mailings = await query<{ id: number; field: string }>(
      "SELECT id::int AS id, airtable_field AS field FROM mailings ORDER BY id",
    );
    const token = airtableToken();
    const emails = await fetchEmails(
      token,
      mailings.map((mailing) => mailing.field),
    );
    const tests = new Set(await fetchTestPoliticianIds(token));
    const mailingIds = new Map(mailings.map((mailing) => [mailing.field, mailing.id]));
    return transaction(async (db) => {
      const result: EmailSyncResult = { read: emails.length, added: 0, waiting: 0, noPolitician: 0, unplaced: [] };
      const known = new Set(
        (
          await query<{ airtableId: string }>(
            `SELECT airtable_id AS "airtableId" FROM pauseai_letters WHERE airtable_id = ANY($1::text[])`,
            [emails.map((email) => email.airtableId)],
            db,
          )
        ).map((row) => row.airtableId),
      );
      for (const email of emails) {
        if (known.has(email.airtableId)) continue;
        if (email.politicians.length !== 1) {
          result.noPolitician++;
          continue;
        }
        if (tests.has(email.politicians[0])) continue;
        if (email.mailings.length !== 1) {
          result.unplaced.push({ airtableId: email.airtableId, mailings: email.mailings });
          continue;
        }
        const [person] = await query<{ id: number }>(
          "SELECT id::int AS id FROM notable_people WHERE airtable_id = $1",
          [email.politicians[0]],
          db,
        );
        if (!person) {
          result.waiting++;
          continue;
        }
        const [{ id }] = await query<{ id: number }>(
          `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at)
           VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id`,
          [person.id, email.at],
          db,
        );
        await query(
          `INSERT INTO pauseai_letters (id, mailing_id, airtable_id, personalised) VALUES ($1, $2, $3, $4)`,
          [id, mailingIds.get(email.mailings[0]), email.airtableId, email.personalised],
          db,
        );
        result.added++;
      }
      if (result.added > 0) await logChange("sync", "copy PauseAI emails", { added: result.added }, db);
      await recordRun(JOB, startedBy, result.added > 0 ? "ok" : "unchanged", result, db);
      return result;
    });
  });
}
