import { outsideFetch } from "@/lib/outside-fetch";

export type SourceCounts = {
  /** Registrations per requested tag, every tag present (0 if none). */
  counts: Record<string, number>;
  /** Registrations with any other utm_source, or none. */
  other: number;
  /** Every registration counted (declined guests excluded). */
  total: number;
};

type GuestEntry = { guest?: { approval_status?: string; utm_source?: string | null; registered_at?: string } };

/**
 * Tallies an event's registrations by utm_source. Tags are matched
 * case-insensitively, so ?utm_source=Brixton still lands on "brixton".
 * Declined guests are not signups and are skipped, as is anyone who registered
 * before `since` (so test scans of the QR codes don't count) or at/after
 * `until`, so the count covers a fixed window.
 *
 * Takes only what it needs from each guest: the Luma payload also holds names,
 * emails and phone numbers, and none of that leaves this function.
 */
export function tallySources(entries: GuestEntry[], tags: readonly string[], since?: Date, until?: Date): SourceCounts {
  const counts = Object.fromEntries(tags.map((tag) => [tag, 0]));
  let other = 0;
  let total = 0;
  for (const { guest } of entries) {
    if (!guest || guest.approval_status === "declined") continue;
    if (since || until) {
      const registered = guest.registered_at ? new Date(guest.registered_at) : null;
      if (!registered || (since && registered < since) || (until && registered >= until)) continue;
    }
    total++;
    const source = guest.utm_source?.trim().toLowerCase();
    if (source && Object.hasOwn(counts, source)) counts[source]++;
    else other++;
  }
  return { counts, other, total };
}

/**
 * The tag(s) with the most registrations: more than one on a tie, none if
 * nobody registered through any stall.
 */
export function leaders(counts: Record<string, number>): string[] {
  const best = Math.max(0, ...Object.values(counts));
  return best === 0 ? [] : Object.keys(counts).filter((tag) => counts[tag] === best);
}

/**
 * The tag(s) with the fewest registrations, for the wooden spoon: more than one
 * on a tie, none when every stall is level (including all on zero), since then
 * nobody is last.
 */
export function lastPlace(counts: Record<string, number>): string[] {
  const values = Object.values(counts);
  const worst = Math.min(...values);
  return worst === Math.max(...values) ? [] : Object.keys(counts).filter((tag) => counts[tag] === worst);
}

/**
 * Competition ranking (1, 1, 3): tied stalls share a rank and the next one skips
 * ahead, so two golds are followed by a bronze. Stalls with no signups are unranked.
 */
export function ranks(counts: Record<string, number>): Record<string, number | null> {
  const values = Object.values(counts);
  return Object.fromEntries(
    Object.entries(counts).map(([tag, count]) => [tag, count > 0 ? 1 + values.filter((other) => other > count).length : null])
  );
}

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
