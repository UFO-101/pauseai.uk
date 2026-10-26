import "server-only";
import { FRONTIER_AI_LETTER_ASK } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import { airtableToken, fetchSignatoriesForImport, type SignatoryToImport } from "./outside-services/airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import type { SignatoryImportResult } from "@/lib/import-runs";
import { keepingFailure, recordRun } from "./import-runs";
import { addPolitician, setStatus, type House } from "./politicians";

// The one-off copy of the signatories from Airtable into the database. Safe
// to run more than once: it never
// overwrites a status already set, and finds the people it added last time.
// Each run goes in the import log (import-runs.ts, as "import-signatories").

const JOB = "import-signatories";
const ASK = FRONTIER_AI_LETTER_ASK;

// Airtable's Body, for signers who aren't sitting MPs.
const HOUSES: Record<string, House> = {
  "House of Lords": "lords",
  "Scottish Parliament": "scottish-parliament",
  "Welsh Parliament": "senedd",
  "Northern Ireland Assembly": "ni-assembly",
};

/** The house to add a signer to. Without a Body, a peer has no constituency. */
function houseFor(signatory: SignatoryToImport): House {
  return HOUSES[signatory.body] ?? (signatory.body || signatory.constituency ? "other" : "lords");
}

async function findPolitician(signatory: SignatoryToImport, db: Queryable): Promise<number | undefined> {
  const [byMp] = await query<{ id: number }>(
    `SELECT n.id::int AS id FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE p.house = 'commons' AND n.status = 'in_office' AND NOT p.is_test AND n.airtable_id IS NOT NULL
       AND (n.airtable_id = $1 OR (lower(n.email) = lower($2) AND $2 <> '') OR (p.constituency = $3 AND $3 <> ''))
     ORDER BY (n.airtable_id = $1) DESC, (lower(n.email) = lower($2)) DESC LIMIT 1`,
    [signatory.airtableId, signatory.email, signatory.constituency],
    db,
  );
  if (byMp) return byMp.id;
  const [byName] = await query<{ id: number }>(
    `SELECT n.id::int AS id FROM notable_people n JOIN politicians p ON p.id = n.id
     WHERE n.airtable_id IS NULL AND NOT p.is_test AND n.name = $1 LIMIT 1`,
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
          const details = {
            house: houseFor(signatory),
            name: signatory.name,
            constituency: signatory.constituency || null,
            party: signatory.party,
            email: signatory.email || null,
          };
          id = await addPolitician(details, db);
          await logChange(staff, "add politician", { id, ...details }, db);
          result.added++;
        } else {
          result.matched++;
        }
        const [existing] = await query(
          "SELECT 1 FROM ask_statuses WHERE notable_person_id = $1 AND ask = $2",
          [id, ASK],
          db,
        );
        if (existing) {
          result.alreadySet++;
          continue;
        }
        await setStatus(id, ASK, { status: "signed", date: null, note: staffCopy.import.note }, staff, db);
      }
      await recordRun(JOB, staff, "ok", result, db);
      await logChange(staff, "import signatories from Airtable", result, db);
      return result;
    });
  });
}
