import "server-only";
import { fetchCurrentMps, type ParliamentMp } from "@/lib/parliament";
import { outsideFetch } from "./outside-fetch";

// Parliament's Members API, no key needed. lib/parliament.ts knows its
// paths and reads its answers; this fetches them.

// It answers 429 when asked too much at once, which ~650 contact lookups
// can do. Wait as it says (Retry-After, in seconds), or longer each time,
// and try again.
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

/** Every sitting MP, with their emails, as Parliament lists them. */
export function currentMps(): Promise<ParliamentMp[]> {
  return fetchCurrentMps(getJson);
}
