import "server-only";
import { tallySources, type GuestEntry, type SourceCounts } from "@/lib/trackers";
import { LUMA_PAGE_SIZE, lumaList, type LumaPage } from "./luma-api";
import { outsideFetch } from "./outside-fetch";

// An event's guest list, through Luma's official API: for the flyering
// trackers' tallies, for the import, which keeps each guest, and for the
// march sign-up, which adds one.

/** A guest as Luma lists them, as far as we read them: bare, or wrapped as { guest }. */
type ApiGuest = {
  id?: string;
  api_id?: string;
  user_id?: string;
  user_api_id?: string;
  user_email?: string;
  email?: string;
  user_name?: string | null;
  name?: string | null;
  approval_status?: string;
  registered_at?: string | null;
  phone_number?: string | null;
  utm_source?: string | null;
  registration_answers?: { label?: string; answer?: unknown; value?: unknown }[] | null;
};
type ApiGuestEntry = (ApiGuest & { guest?: ApiGuest }) | null;

/** One page of an event's guests, as Luma lists them. Throws as lumaList does. */
async function guestsPage(eventId: string, cursor?: string): Promise<LumaPage<ApiGuest>> {
  const params = new URLSearchParams({ event_id: eventId, pagination_limit: String(LUMA_PAGE_SIZE) });
  if (cursor) params.set("pagination_cursor", cursor);
  const page = await lumaList<ApiGuestEntry>("/v1/events/guests/list", params);
  // Entries come as { api_id, guest } or as bare guests, depending on version.
  return { ...page, entries: page.entries.flatMap((entry) => (entry ? [entry.guest ?? entry] : [])) };
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
  until?: Date,
): Promise<SourceCounts | null> {
  const entries: GuestEntry[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await guestsPage(eventApiId, cursor);
      for (const guest of page.entries) entries.push({ guest });
      cursor = page.nextCursor;
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

/** A guest as the import keeps them. */
export type EventGuest = {
  id: string;
  userId: string;
  email: string;
  name: string;
  /** approved, pending_approval, waitlist, declined, or invited (never registered). */
  approvalStatus: string;
  registeredAt: string | null;
  phone: string | null;
  /** Their answer to a registration question whose label contains "postcode", as typed. */
  postcode: string | null;
  utmSource: string | null;
};

/** The guest's postcode answer, if the event asked for one and they gave it. */
function postcodeAnswer(guest: ApiGuest): string | null {
  for (const answer of guest.registration_answers ?? []) {
    if (!/postcode/i.test(answer.label ?? "")) continue;
    const given = typeof answer.answer === "string" ? answer.answer : answer.value;
    if (typeof given === "string" && given.trim()) return given.trim();
  }
  return null;
}

/** One page of an event's guests, for the import. Throws as lumaList does. */
export async function listEventGuests(eventId: string, cursor?: string): Promise<LumaPage<EventGuest>> {
  const page = await guestsPage(eventId, cursor);
  return {
    ...page,
    entries: page.entries.flatMap((guest) => {
      const id = guest.id ?? guest.api_id;
      const userId = guest.user_id ?? guest.user_api_id;
      const email = guest.user_email ?? guest.email;
      if (!id || !userId || !email) return [];
      return [
        {
          id,
          userId,
          email,
          name: guest.user_name ?? guest.name ?? "",
          approvalStatus: guest.approval_status ?? "",
          registeredAt: guest.registered_at ?? null,
          phone: guest.phone_number || null,
          postcode: postcodeAnswer(guest),
          utmSource: guest.utm_source || null,
        },
      ];
    }),
  };
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
