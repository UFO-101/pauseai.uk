import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { fetchSignatoriesForImport } from "./airtable";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { setStatus } from "./politicians";

// The one-off copy of the signatories from Airtable into the database (stage
// 3 of plans/email-your-mp-v2.md). Safe to run more than once: it never
// overwrites a status already set, and finds the people it added last time.

const CAMPAIGN = "regulate-pm-letter";

export type ImportResult = { matched: number; added: number; alreadySet: number };

async function findPolitician(signatory: { email: string; constituency: string; name: string }, db: Queryable): Promise<number | undefined> {
  const [byMp] = await query<{ id: number }>(
    `SELECT id::int AS id FROM politicians
     WHERE house = 'commons' AND sitting AND NOT is_test AND parliament_id IS NOT NULL
       AND ((lower(email) = lower($1) AND $1 <> '') OR (constituency = $2 AND $2 <> ''))
     ORDER BY (lower(email) = lower($1)) DESC LIMIT 1`,
    [signatory.email.trim(), signatory.constituency],
    db,
  );
  if (byMp) return byMp.id;
  const [byName] = await query<{ id: number }>("SELECT id::int AS id FROM politicians WHERE parliament_id IS NULL AND NOT is_test AND name = $1 LIMIT 1", [signatory.name], db);
  return byName?.id;
}

export async function importSignatories(token: string, staff: string): Promise<ImportResult> {
  const fromAirtable = await fetchSignatoriesForImport(token);
  return transaction(async (db) => {
    const result: ImportResult = { matched: 0, added: 0, alreadySet: 0 };
    for (const signatory of fromAirtable) {
      let id = await findPolitician(signatory, db);
      if (id === undefined) {
        // Not a sitting MP: a peer (Airtable lists them without a
        // constituency), or someone else, for the policy team to check.
        [{ id }] = await query<{ id: number }>(
          `INSERT INTO politicians (house, name, constituency, party, email) VALUES ($1, $2, $3, $4, $5) RETURNING id::int AS id`,
          [signatory.constituency ? "other" : "lords", signatory.name, signatory.constituency || null, signatory.party, signatory.email.trim() || null],
          db,
        );
        result.added++;
      } else {
        result.matched++;
      }
      const [existing] = await query("SELECT 1 FROM campaign_statuses WHERE politician_id = $1 AND campaign = $2", [id, CAMPAIGN], db);
      if (existing) {
        result.alreadySet++;
        continue;
      }
      await setStatus(id, CAMPAIGN, { status: "signed", date: null, note: staffCopy.import.note }, staff, db);
    }
    await logChange(staff, "import signatories from Airtable", result, db);
    return result;
  });
}
