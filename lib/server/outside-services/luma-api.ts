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
 * Fetches `path` with `params`: its JSON, and the requests left in this
 * minute when Luma says. Uncached, unless `revalidate` says how many seconds
 * Next may keep the answer. Throws LumaRateLimited on a 429, and an Error
 * for a missing key or any other answer that isn't ok.
 */
export async function lumaGet<T>(
  path: string,
  params: URLSearchParams,
  revalidate?: number,
): Promise<{ data: T; remaining?: number }> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error("LUMA_API_KEY is not set");
  const res = await outsideFetch(`https://public-api.luma.com${path}?${params}`, {
    headers: { "x-luma-api-key": key, accept: "application/json" },
    ...(revalidate === undefined ? { cache: "no-store" } : { next: { revalidate } }),
  });
  if (res.status === 429) throw new LumaRateLimited(Number(res.headers.get("retry-after")) || 60);
  if (!res.ok) throw new Error(`Luma answered ${res.status} for ${path}`);
  const remaining = res.headers.get("x-ratelimit-remaining");
  return { data: (await res.json()) as T, remaining: remaining === null ? undefined : Number(remaining) };
}

/** Fetches one page of `path` with `params`, as lumaGet does, as raw entries. */
export async function lumaList<T>(path: string, params: URLSearchParams, revalidate?: number): Promise<LumaPage<T>> {
  const { data, remaining } = await lumaGet<{ entries?: T[]; has_more?: boolean; next_cursor?: string }>(
    path,
    params,
    revalidate,
  );
  return {
    entries: data.entries ?? [],
    nextCursor: data.has_more && data.next_cursor ? data.next_cursor : undefined,
    remaining,
  };
}
