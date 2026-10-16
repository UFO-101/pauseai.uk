import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { airtableToken, fetchSignatoriesForImport, type SignatoryToImport } from "./airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import type { ImportRun } from "@/lib/import-runs";
import { keepingFailure, recentRuns, recordRun } from "./import-runs";
import { setStatus } from "./politicians";

// The one-off copy of the signatories from Airtable into the database (stage
// 3 of plans/email-your-mp-v2.md). Safe to run more than once: it never
// overwrites a status already set, and finds the people it added last time.
// Each run goes in the import log (import-runs.ts, as "import-signatories").

const JOB = "import-signatories";
const CAMPAIGN = "regulate-letter-pm";

export type SignatoryImportResult = { matched: number; added: number; alreadySet: number };

export type SignatoryImport = ImportRun<SignatoryImportResult>;

// Airtable's Body, for signers who aren't sitting MPs.
const HOUSES: Record<string, string> = {
  "House of Lords": "lords",
  "Scottish Parliament": "scottish-parliament",
  "Welsh Parliament": "senedd",
  "Northern Ireland Assembly": "ni-assembly",
};

/** The house to add a signer to. Without a Body, a peer has no constituency. */
function houseFor(signatory: SignatoryToImport): string {
  return HOUSES[signatory.body] ?? (signatory.body || signatory.constituency ? "other" : "lords");
}

async function findPolitician(signatory: SignatoryToImport, db: Queryable): Promise<number | undefined> {
  const [byMp] = await query<{ id: number }>(
    `SELECT id::int AS id FROM politicians
     WHERE house = 'commons' AND sitting AND NOT is_test AND airtable_id IS NOT NULL
       AND (airtable_id = $1 OR (lower(email) = lower($2) AND $2 <> '') OR (constituency = $3 AND $3 <> ''))
     ORDER BY (airtable_id = $1) DESC, (lower(email) = lower($2)) DESC LIMIT 1`,
    [signatory.airtableId, signatory.email, signatory.constituency],
    db,
  );
  if (byMp) return byMp.id;
  const [byName] = await query<{ id: number }>(
    "SELECT id::int AS id FROM politicians WHERE airtable_id IS NULL AND NOT is_test AND name = $1 LIMIT 1",
    [signatory.name],
    db,
  );
  return byName?.id;
}

export function importSignatories(staff: string): Promise<SignatoryImportResult> {
  return keepingFailure(JOB, staff, async () => {
    const fromAirtable = await fetchSignatoriesForImport(airtableToken());
    return transaction(async (db) => {
      const result: SignatoryImportResult = { matched: 0, added: 0, alreadySet: 0 };
      for (const signatory of fromAirtable) {
        let id = await findPolitician(signatory, db);
        if (id === undefined) {
          // Not a sitting MP: a peer, an MSP, MS or MLA, or someone else
          // (such as a former MP), for the policy team to check.
          [{ id }] = await query<{ id: number }>(
            `INSERT INTO politicians (house, name, constituency, party, email) VALUES ($1, $2, $3, $4, $5) RETURNING id::int AS id`,
            [
              houseFor(signatory),
              signatory.name,
              signatory.constituency || null,
              signatory.party,
              signatory.email || null,
            ],
            db,
          );
          result.added++;
        } else {
          result.matched++;
        }
        const [existing] = await query(
          "SELECT 1 FROM campaign_statuses WHERE politician_id = $1 AND campaign = $2",
          [id, CAMPAIGN],
          db,
        );
        if (existing) {
          result.alreadySet++;
          continue;
        }
        await setStatus(id, CAMPAIGN, { status: "signed", date: null, note: staffCopy.import.note }, staff, db);
      }
      await recordRun(JOB, staff, "ok", result, db);
      await logChange(staff, "import signatories from Airtable", result, db);
      return result;
    });
  });
}

export const recentSignatoryImports = () => recentRuns<SignatoryImportResult>(JOB);
