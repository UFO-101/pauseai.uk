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
  until?: Date,
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
  close: Date,
): Promise<[SourceCounts | null, SourceCounts | null]> {
  return Promise.all([getSourceCounts(eventApiId, tags, open, close), getSourceCounts(eventApiId, tags, close)]);
}

/** How long adding a guest may take before the sign-up gives up and says so. */
const ADD_GUEST_TIMEOUT_MS = 5000;

/**
 * What adding a guest came to. "added" means Luma took the request: it adds
 * guests in the background, so it doesn't prove the guest is there yet.
 * "skipped" is Luma declining this guest (unsubscribed from the calendar,
 * removed or blocked). "not-configured" is LUMA_API_KEY not being set.
 */
export type LumaAddGuestResult =
  { status: "added" } | { status: "skipped" } | { status: "not-configured" } | { status: "failed"; reason: string };

/**
 * Registers one guest for an event, through Luma's add-guests call
 * (https://docs.luma.com/reference/post_v1-events-guests-add). Luma then
 * emails them its confirmation. Never throws: every outcome, a missing key,
 * an error, a timeout, comes back as a result, for the caller to tell the
 * visitor.
 */
export async function addLumaGuest(
  eventId: string,
  guest: { name: string; email: string },
  timeoutMs = ADD_GUEST_TIMEOUT_MS,
): Promise<LumaAddGuestResult> {
  const key = process.env.LUMA_API_KEY?.trim();
  if (!key) return { status: "not-configured" };

  try {
    const res = await outsideFetch("https://public-api.luma.com/v1/events/guests/add", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "x-luma-api-key": key },
      body: JSON.stringify({ event_id: eventId, guests: [{ email: guest.email, name: guest.name }] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      // The start of the body says why: a bad key, an unknown event, a rate limit.
      const body = (await res.text()).slice(0, 300);
      return { status: "failed", reason: `Luma responded ${res.status}${body ? `: ${body}` : ""}` };
    }
    const data = (await res.json()) as { skipped?: { email?: unknown }[] };
    const email = guest.email.toLowerCase();
    const skipped = (data.skipped ?? []).some((s) => typeof s.email === "string" && s.email.toLowerCase() === email);
    return skipped ? { status: "skipped" } : { status: "added" };
  } catch (error) {
    const err = error as Error;
    if (err.name === "TimeoutError") return { status: "failed", reason: `Luma did not respond within ${timeoutMs}ms` };
    return { status: "failed", reason: `Request to Luma failed: ${err.message}` };
  }
}
