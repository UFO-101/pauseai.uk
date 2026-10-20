import "server-only";
import { checkAgainstParliament, type MpProblem } from "@/lib/mp-check";
import { keepingFailure, recordRun } from "./import-runs";
import { sittingMps } from "./mp-sync";
import { currentMps } from "./outside-services/parliament";

// Compares the MPs copied from Airtable with Parliament's, nightly
// (app/api/cron/check-mps) or when staff ask, and keeps what it finds in
// the import log (import-runs.ts, as "check-mps") for /staff/import-data. It
// changes nothing else.

const JOB = "check-mps";

/** Checks the sitting MPs against Parliament's, keeping the result, or the failure. */
export function checkMps(startedBy: string): Promise<MpProblem[]> {
  return keepingFailure(JOB, startedBy, async () => {
    const parliament = await currentMps();
    const problems = checkAgainstParliament(await sittingMps(), parliament);
    await recordRun(JOB, startedBy, "ok", { problems });
    return problems;
  });
}
