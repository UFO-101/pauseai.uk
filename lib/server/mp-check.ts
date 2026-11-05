import "server-only";
import { checkAgainstParliament, ownDomains, type MpProblem } from "@/lib/mp-check";
import { query } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { mpsInOffice } from "./politician-sync";
import { currentMps } from "./outside-services/parliament";
import type { ParliamentMp } from "@/lib/parliament";

// Compares the MPs copied from Airtable with Parliament's, nightly
// (app/api/cron/check-mps) or when staff ask, and keeps what it finds in
// the import log (import-runs.ts, as "check-mps") for /staff/import-data. It
// changes nothing else but politician_domains, the domains of their own
// Parliament lists, which say whose a thread is (lib/server/one-off-emails.ts).

const JOB = "check-mps";

/** Keeps each MP's own domains, by their constituency: one no longer listed goes. */
async function saveOwnDomains(parliament: ParliamentMp[]): Promise<void> {
  const ours = await query<{ id: number; constituency: string }>(
    `SELECT p.id::int AS id, p.constituency FROM politicians p JOIN notable_people n USING (id)
     WHERE p.house = 'commons' AND n.status = 'in_office'`,
  );
  const ids = new Map(ours.map((mp) => [mp.constituency, mp.id]));
  const people = parliament.flatMap((mp) => {
    const id = ids.get(mp.constituency);
    return id === undefined ? [] : [{ id, addresses: [...mp.emails, ...mp.websites] }];
  });
  const domains = ownDomains(people);
  await query("DELETE FROM politician_domains WHERE NOT (domain = ANY($1::text[]))", [[...domains.keys()]]);
  await query(
    `INSERT INTO politician_domains (domain, notable_person_id) SELECT * FROM unnest($1::text[], $2::bigint[])
     ON CONFLICT (domain) DO UPDATE SET notable_person_id = EXCLUDED.notable_person_id, seen_at = now()`,
    [[...domains.keys()], [...domains.values()]],
  );
}

/** Checks the MPs in office against Parliament's, keeping the result, or the failure. */
export function checkMps(startedBy: string): Promise<MpProblem[]> {
  return keepingFailure(JOB, startedBy, async () => {
    const parliament = await currentMps();
    const problems = checkAgainstParliament(await mpsInOffice(), parliament);
    await saveOwnDomains(parliament);
    await recordRun(JOB, startedBy, "ok", { problems });
    return problems;
  });
}
