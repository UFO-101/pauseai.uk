import "server-only";
import { outsideFetch } from "./outside-fetch";

// One page of a list from Luma's official API (LUMA_API_KEY, scoped to our
// calendar), for the import, which pages through events, guests and
// contacts. Luma allows 200 requests a minute, shared with the site's own
// fetches, answers 429 beyond that, and says in every response how many are
// left. Pages are capped at 50.

/** The most entries a page can hold. */
export const LUMA_PAGE_SIZE = 50;

export type LumaPage<T> = {
  entries: T[];
  /** The cursor for the next page, if there is one. */
  nextCursor?: string;
  /** Requests left in this minute, by Luma's x-ratelimit-remaining header, when it sends one. */
  remaining?: number;
};

/** Luma answered 429: wait `retryAfter` seconds. */
export class LumaRateLimited extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Luma's rate limit reached: retry after ${retryAfter}s`);
  }
}

/**
 * Fetches one page of `path` with `params`, uncached, as raw entries. Throws
 * LumaRateLimited on a 429, and an Error for a missing key or any other
 * answer that isn't ok.
 */
export async function lumaList<T>(path: string, params: URLSearchParams): Promise<LumaPage<T>> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error("LUMA_API_KEY is not set");
  const res = await outsideFetch(`https://public-api.luma.com${path}?${params}`, {
    headers: { "x-luma-api-key": key, accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 429) throw new LumaRateLimited(Number(res.headers.get("retry-after")) || 60);
  if (!res.ok) throw new Error(`Luma answered ${res.status} for ${path}`);
  const data = await res.json();
  const remaining = res.headers.get("x-ratelimit-remaining");
  return {
    entries: data.entries ?? [],
    nextCursor: data.has_more && data.next_cursor ? data.next_cursor : undefined,
    remaining: remaining === null ? undefined : Number(remaining),
  };
}
