import "server-only";
import { extractText } from "unpdf";
import {
  SOBEL_BILL_CAMPAIGN,
  CONTROLAI,
  CONTROLAI_LETTER_PAGE,
  matchSignatories,
  pdfUrlIn,
  signatoriesIn,
  type Candidate,
  type ControlAiMatchProblem,
} from "@/lib/controlai-letter";
import { logChange } from "./audit";
import { query, transaction } from "./db";
import { outsideFetch } from "./outside-fetch";

// Copies the signatories of ControlAI's letter to the PM into the bill's
// statuses, nightly (app/api/cron/import-controlai) or when staff ask, and
// keeps each run for /staff/import-data (plans/sobel-bill-support.md). The
// table is made to match the letter: statuses it set for names no longer
// there go. It never touches another campaign's statuses, or one set by
// anything else.

/** Fewer names than this means the page or the PDF has changed shape, so nothing is changed. */
const MIN_SIGNATORIES = 5;

export type ControlAiImportResult =
  | {
      ok: true;
      pdfUrl: string;
      /** Names in the letter. */
      signatories: number;
      /** Of those, in our table. */
      matched: number;
      /** Statuses set and removed this run. */
      added: number;
      removed: number;
      problems: ControlAiMatchProblem[];
    }
  | { ok: false; error: string };

export type ControlAiImport = { at: string; result: ControlAiImportResult };

async function fetchOk(url: string): Promise<Response> {
  const res = await outsideFetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res;
}

/** The letter's text, from the PDF the page links to. */
async function fetchLetter(): Promise<{ pdfUrl: string; text: string }> {
  const html = await (await fetchOk(CONTROLAI_LETTER_PAGE)).text();
  const pdfUrl = pdfUrlIn(html);
  if (!pdfUrl) throw new Error(`No PDF linked from ${CONTROLAI_LETTER_PAGE}`);
  const pdf = new Uint8Array(await (await fetchOk(pdfUrl)).arrayBuffer());
  const { text } = await extractText(pdf, { mergePages: true });
  return { pdfUrl, text };
}

async function keep(result: ControlAiImportResult): Promise<void> {
  await query("INSERT INTO controlai_imports (result) VALUES ($1)", [JSON.stringify(result)]);
}

/** Reads the letter and makes the bill's statuses match it. Keeps the result, or the failure, then throws it on. */
export async function importControlAiLetter(): Promise<ControlAiImportResult> {
  let result: ControlAiImportResult;
  try {
    const { pdfUrl, text } = await fetchLetter();
    const signatories = signatoriesIn(text);
    if (signatories.length < MIN_SIGNATORIES) {
      throw new Error(`Only ${signatories.length} signatories found in ${pdfUrl}: has the letter changed shape?`);
    }
    result = await transaction(async (db) => {
      // Sitting MPs and peers; never the test MPs, whose statuses are their own.
      const candidates = await query<Candidate>(
        `SELECT id::int AS id, house, name FROM politicians
         WHERE NOT is_test AND ((house = 'commons' AND sitting) OR house = 'lords') ORDER BY id`,
        [],
        db,
      );
      const { matched, problems } = matchSignatories(signatories, candidates);
      const ids = [...matched.keys()];
      const added = await query(
        `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by)
         SELECT id, $2, 'signed', $3 FROM unnest($1::bigint[]) AS id
         ON CONFLICT (politician_id, campaign) DO NOTHING RETURNING politician_id`,
        [ids, SOBEL_BILL_CAMPAIGN, CONTROLAI],
        db,
      );
      const removed = await query(
        `DELETE FROM campaign_statuses WHERE campaign = $2 AND updated_by = $3 AND NOT (politician_id = ANY($1::bigint[]))
         RETURNING politician_id`,
        [ids, SOBEL_BILL_CAMPAIGN, CONTROLAI],
        db,
      );
      const result: ControlAiImportResult = {
        ok: true,
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
      }
      return result;
    });
  } catch (error) {
    await keep({ ok: false, error: String(error).replace(/^Error: /, "") });
    throw error;
  }
  await keep(result);
  return result;
}

export async function latestControlAiImport(): Promise<ControlAiImport | undefined> {
  const [run] = await query<ControlAiImport>(
    "SELECT at, result FROM controlai_imports ORDER BY at DESC, id DESC LIMIT 1",
  );
  return run;
}
