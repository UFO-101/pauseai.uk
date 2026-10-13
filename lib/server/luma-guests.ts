import "server-only";
import { tallySources, type GuestEntry, type SourceCounts } from "@/lib/trackers";
import { outsideFetch } from "./outside-fetch";

/**
 * Pages through Luma's authenticated guest list for an event. Returns null when
 * LUMA_API_KEY is missing or Luma errors, so the page can say so rather than
 * show a misleading zero.
 */
export async function getSourceCounts(
  eventApiId: string,
  tags: readonly string[],
  since?: Date,
  until?: Date
): Promise<SourceCounts | null> {
  const key = process.env.LUMA_API_KEY;
  if (!key) return null;

  const entries: GuestEntry[] = [];
  let cursor: string | undefined;
  try {
    do {
      const params = new URLSearchParams({ event_api_id: eventApiId, pagination_limit: "100" });
      if (cursor) params.set("pagination_cursor", cursor);
      const res = await outsideFetch(`https://public-api.luma.com/v1/event/get-guests?${params}`, {
        headers: { "x-luma-api-key": key, accept: "application/json" },
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      // The list endpoint returns entries as { api_id, guest } or bare guests
      // depending on version; normalise so tallySources sees one shape.
      for (const entry of data.entries ?? []) entries.push(entry.guest ? entry : { guest: entry });
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
  } catch {
    return null;
  }
  return tallySources(entries, tags, since, until);
}

/**
 * A flyering race's two windows over the same guest list (Next dedupes the
 * identical Luma fetches): the race itself, and everything after it.
 */
export function getRaceCounts(
  eventApiId: string,
  tags: readonly string[],
  open: Date,
  close: Date
): Promise<[SourceCounts | null, SourceCounts | null]> {
  return Promise.all([getSourceCounts(eventApiId, tags, open, close), getSourceCounts(eventApiId, tags, close)]);
}
