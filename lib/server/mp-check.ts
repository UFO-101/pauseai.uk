import "server-only";
import { checkAgainstParliament, type MpProblem } from "@/lib/mp-check";
import { fetchCurrentMps } from "@/lib/parliament";
import { keepingFailure, recordRun } from "./import-runs";
import { sittingMps } from "./mp-sync";
import { outsideFetch } from "./outside-fetch";

// Compares the MPs copied from Airtable with Parliament's, nightly
// (app/api/cron/check-mps) or when staff ask, and keeps what it finds in
// the import log (import-runs.ts, as "check-mps") for /staff/import-data. It
// changes nothing else.

const JOB = "check-mps";

// Parliament's API answers 429 when asked too much at once, which ~650
// contact lookups can do. Wait as it says (Retry-After, in seconds), or
// longer each time, and try again.
const ATTEMPTS = 5;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await outsideFetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (res.ok) return res.json();
    if ((res.status !== 429 && res.status !== 503) || attempt === ATTEMPTS)
      throw new Error(`${url} returned ${res.status}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    await wait(
      Number.isFinite(retryAfter) && res.headers.has("retry-after") ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1),
    );
  }
}

/** Checks the sitting MPs against Parliament's, keeping the result, or the failure. */
export function checkMps(startedBy: string): Promise<MpProblem[]> {
  return keepingFailure(JOB, startedBy, async () => {
    const parliament = await fetchCurrentMps(getJson);
    const problems = checkAgainstParliament(await sittingMps(), parliament);
    await recordRun(JOB, startedBy, "ok", { problems });
    return problems;
  });
}
