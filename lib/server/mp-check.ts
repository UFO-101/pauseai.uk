import "server-only";
import { checkAgainstParliament, type MpProblem } from "@/lib/mp-check";
import { fetchCurrentMps } from "@/lib/parliament";
import { query } from "./db";
import { sittingMps } from "./mp-sync";
import { outsideFetch } from "./outside-fetch";

// Compares the MPs copied from Airtable with Parliament's, nightly
// (app/api/cron/check-mps) or when staff ask, and keeps what it finds for
// /staff/mp-check. It changes nothing else.

// Parliament's API answers 429 when asked too much at once, which ~650
// contact lookups can do. Wait as it says (Retry-After, in seconds), or
// longer each time, and try again.
const ATTEMPTS = 5;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const res = await outsideFetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (res.ok) return res.json();
    if ((res.status !== 429 && res.status !== 503) || attempt === ATTEMPTS) throw new Error(`${url} returned ${res.status}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) && res.headers.has("retry-after") ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1));
  }
}

export type MpCheck = { at: string; problems: MpProblem[] };

/** Checks the sitting MPs against Parliament's, and keeps the result. */
export async function checkMps(): Promise<MpProblem[]> {
  const parliament = await fetchCurrentMps(getJson);
  const problems = checkAgainstParliament(await sittingMps(), parliament);
  await query("INSERT INTO mp_checks (problems) VALUES ($1)", [JSON.stringify(problems)]);
  return problems;
}

/** The newest check, if there's been one. */
export async function latestCheck(): Promise<MpCheck | undefined> {
  const [check] = await query<MpCheck>("SELECT at, problems FROM mp_checks ORDER BY at DESC, id DESC LIMIT 1");
  return check;
}
