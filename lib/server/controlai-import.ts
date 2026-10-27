import "server-only";
import { CONTROLAI_LETTER_ASK } from "@/lib/asks";
import { CONTROLAI, matchSignatories, signatoriesIn, type Candidate } from "@/lib/controlai-letter";
import type { ControlAiImportResult } from "@/lib/import-runs";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { fetchLetter } from "./outside-services/controlai";

// Copies the signatories of ControlAI's letter to the PM into the statuses
// of its ask (CONTROLAI_LETTER_ASK), nightly (app/api/cron/import-controlai) or when staff ask, and
// keeps each run, failures included, in the import log (import-runs.ts, as
// "import-controlai") for /staff/import-data.
// The table is made to match the letter: statuses it set for names no
// longer there go. It never touches another ask's statuses, or one set by
// anything else.

const JOB = "import-controlai";

/** Fewer names than this means the page or the PDF has changed shape, so nothing is changed. */
const MIN_SIGNATORIES = 5;

/** Reads the letter and makes the bill's statuses match it. Keeps the result, or the failure, then throws it on. */
export function importControlAiLetter(startedBy: string): Promise<ControlAiImportResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const { pdfUrl, text } = await fetchLetter();
    const signatories = signatoriesIn(text);
    if (signatories.length < MIN_SIGNATORIES) {
      throw new Error(`Only ${signatories.length} signatories found in ${pdfUrl}: has the letter changed shape?`);
    }
    return transaction(async (db) => {
      // MPs in office and peers; never the test MPs, whose statuses are their own.
      const candidates = await query<Candidate>(
        `SELECT n.id::int AS id, p.house, n.name FROM notable_people n JOIN politicians p ON p.id = n.id
         WHERE NOT p.is_test AND ((p.house = 'commons' AND n.status = 'in_office') OR p.house = 'lords') ORDER BY n.id`,
        [],
        db,
      );
      const { matched, problems } = matchSignatories(signatories, candidates);
      const ids = [...matched.keys()];
      const added = await query<{ politicianId: number }>(
        `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by)
         SELECT id, $2, 'letter', 'signed', $3 FROM unnest($1::bigint[]) AS id
         ON CONFLICT (notable_person_id, ask) DO NOTHING RETURNING notable_person_id::int AS "politicianId"`,
        [ids, CONTROLAI_LETTER_ASK, CONTROLAI],
        db,
      );
      const removed = await query<{ politicianId: number }>(
        `DELETE FROM ask_statuses WHERE ask = $2 AND updated_by = $3 AND NOT (notable_person_id = ANY($1::bigint[]))
         RETURNING notable_person_id::int AS "politicianId"`,
        [ids, CONTROLAI_LETTER_ASK, CONTROLAI],
        db,
      );
      const result: ControlAiImportResult = {
        pdfUrl,
        signatories: signatories.length,
        matched: ids.length,
        added: added.length,
        removed: removed.length,
        problems,
      };
      if (added.length || removed.length) {
        await logChange(
          CONTROLAI,
          "import ControlAI letter",
          { added: added.length, removed: removed.length, problems: problems.length },
          db,
        );
        // And one entry per politician, as setting a status by hand logs it, so their page can tell it.
        for (const { politicianId } of added) {
          await logChange(
            CONTROLAI,
            "set status",
            { politicianId, ask: CONTROLAI_LETTER_ASK, status: "signed", date: null, note: "" },
            db,
          );
        }
        for (const { politicianId } of removed) {
          await logChange(
            CONTROLAI,
            "set status",
            { politicianId, ask: CONTROLAI_LETTER_ASK, status: null, date: null, note: "" },
            db,
          );
        }
      }
      await recordRun(JOB, startedBy, "ok", result, db);
      return result;
    });
  });
}
