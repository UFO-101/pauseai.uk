import "server-only";
import type { WebFormImportResult } from "@/lib/import-runs";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { airtableToken, fetchWebFormLetters } from "./outside-services/airtable";
import { refreshSupportersList } from "./supporter-facts";
import { linkSupporters } from "./supporters";

// Copies, once, the letters supporters sent through pauseai.info's old UK
// form (/uk-email-mp, July 2025 to October 2026), which kept each in
// Airtable's "Web form emails" for an automation to send: each a letter, and
// its sender a form entry of the "web-form" form, so they become supporters. Each run is in the
// import log, as "import-web-form-letters"; running it again adds nothing
// twice. Never the message: only who, to whom, when, the subject and the
// consent box, which before 23 September 2026 the form didn't have, so a
// blank one is no. The form asked for no address.

const JOB = "import-web-form-letters";

/** Airtable's Campaign, as our campaigns for pauseai.info's letters. */
const CAMPAIGNS: Record<string, string> = {
  "Frontier AI letter": "pauseai-info-frontier-ai",
  "Liability letter": "pauseai-info-liability",
  "DeepMind letter": "pauseai-info-deepmind",
};

/**
 * Imports every letter that was sent, skipping those marked spam or
 * invalid, those already imported, and those already here from the same
 * sender to the same politician for the same ask (or campaign, for one with
 * none). A Campaign it doesn't know is refused.
 */
export function importWebFormLetters(startedBy: string): Promise<WebFormImportResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const letters = await fetchWebFormLetters(airtableToken());
    const unknown = letters.find((letter) => letter.sentAt && !CAMPAIGNS[letter.campaign]);
    if (unknown) throw new Error(`Unknown Campaign "${unknown.campaign}" on ${unknown.airtableId}`);
    return transaction(async (db) => {
      const result: WebFormImportResult = {
        read: letters.length,
        imported: 0,
        skipped: 0,
        alreadyHere: 0,
        noPolitician: 0,
        supportersAdded: 0,
        linked: 0,
      };
      for (const letter of letters) {
        if (letter.spam || letter.invalid || !letter.sentAt) {
          result.skipped++;
          continue;
        }
        const [person] = await query<{ id: number }>(
          "SELECT id::int AS id FROM notable_people WHERE airtable_id = $1 AND $2",
          [letter.recipients[0] ?? "", letter.recipients.length === 1],
          db,
        );
        if (!person) {
          result.noPolitician++;
          continue;
        }
        const campaign = CAMPAIGNS[letter.campaign];
        const [here] = await query(
          `SELECT 1 FROM letters_from_supporters s JOIN letters l ON l.id = s.id JOIN campaigns c ON c.slug = s.campaign
             JOIN form_entries f ON f.id = s.entry_id
           WHERE s.airtable_id = $1
              OR (lower(trim(f.email)) = lower(trim($2)) AND l.notable_person_id = $3
                  AND (c.ask = (SELECT ask FROM campaigns WHERE slug = $4) OR (c.ask IS NULL AND c.slug = $4)))
           LIMIT 1`,
          [letter.airtableId, letter.senderEmail, person.id, campaign],
          db,
        );
        if (here) {
          result.alreadyHere++;
          continue;
        }
        const [{ id }] = await query<{ id: number }>(
          `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at)
           VALUES ('supporter', $1, 'sent', $2, $3) RETURNING id::int AS id`,
          [person.id, letter.submittedAt ?? letter.sentAt, letter.sentAt],
          db,
        );
        const [entry] = await query<{ id: number }>(
          `INSERT INTO form_entries (form, created_at, name, email, postcode, contact_consent)
           VALUES ('web-form', $1, $2, $3, nullif($4, ''), $5) RETURNING id::int AS id`,
          [
            letter.submittedAt ?? letter.sentAt,
            letter.senderName,
            letter.senderEmail,
            letter.senderPostcode,
            letter.consent,
          ],
          db,
        );
        await query(
          `INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, airtable_id) VALUES ($1, $2, $3, $4, $5)`,
          [id, entry.id, campaign, letter.subject, letter.airtableId],
          db,
        );
        result.imported++;
      }
      Object.assign(result, await linkSupporters(db));
      await refreshSupportersList(db);
      const { imported, skipped, alreadyHere, noPolitician } = result;
      await logChange(startedBy, "import web form letters", { imported, skipped, alreadyHere, noPolitician }, db);
      await recordRun(JOB, startedBy, "ok", result, db);
      return result;
    });
  });
}
