export type LumaGeoAddressInfo = {
  city?: string;
  address?: string;
  region?: string;
  country?: string;
};

export type LumaEvent = {
  url: string;
  name: string;
  start_at: string;
  timezone?: string;
  cover_url?: string;
  location_type?: string;
  geo_address_info?: LumaGeoAddressInfo;
};

export type LumaEntry = {
  event: LumaEvent;
};

/** Luma's own names for the two halves of a calendar. */
export type EventPeriod = "future" | "past";

/**
 * Luma returns "future" soonest-first and "past" most-recent-first, so both
 * arrive nearest-to-today first and neither needs sorting here.
 */
export async function getEvents(period: EventPeriod = "future"): Promise<LumaEntry[]> {
  try {
    const res = await fetch(
      `https://api2.luma.com/calendar/get-items?calendar_api_id=cal-Z327EhtiFdHuVie&pagination_limit=50&period=${period}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entries: LumaEntry[] = data.entries ?? [];
    // Guard against malformed Luma records: rendering assumes event.url and
    // event.start_at exist (EventList key, links, date formatting).
    return entries.filter((entry) => entry?.event?.url && entry.event?.start_at);
  } catch {
    return [];
  }
}

/**
 * Lower-cased, punctuation-stripped and space-padded, so a matcher can be
 * tested with plain containment and still only match a whole word: " bath "
 * is in " bristol bath social " but not in " bathurst meetup ".
 */
function normalise(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/**
 * The events belonging to a local group, matched against its `eventMatchers`
 * (see lib/data/local-groups.ts).
 *
 * Luma only fills `geo_address_info.city` for events pinned to a mapped
 * address; plenty of real entries leave it empty and carry the place in the
 * free-text address ("All Across London", "London, Venue TBD") or in the
 * event name ("PauseAI Scotland Meeting"). Searching all three is what stops
 * a local group page looking empty while its events sit on the calendar.
 *
 * `region` is deliberately not searched: it is "England" for most of the
 * calendar and would match every matcher for every local group.
 */
export function filterEventsForLocalGroup(
  entries: LumaEntry[],
  matchers: readonly string[]
): LumaEntry[] {
  const needles = matchers.map(normalise);
  return entries.filter((entry) => {
    const geo = entry.event.geo_address_info;
    const haystack = normalise(
      [entry.event.name, geo?.city, geo?.address].filter(Boolean).join(" ")
    );
    return needles.some((needle) => haystack.includes(needle));
  });
}

// An invalid/unrecognised IANA timezone throws RangeError from
// toLocaleDateString/toLocaleTimeString — seen in practice from bad Luma
// records — so fall back to Europe/London rather than 500ing the page.
function safeLocaleString(
  method: "toLocaleDateString" | "toLocaleTimeString",
  startAt: string,
  timezone: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const date = new Date(startAt);
  try {
    return date[method]("en-GB", { ...options, timeZone: timezone || "Europe/London" });
  } catch {
    return date[method]("en-GB", { ...options, timeZone: "Europe/London" });
  }
}

export function formatEventDate(startAt: string, timezone?: string): string {
  return safeLocaleString("toLocaleDateString", startAt, timezone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatEventTime(startAt: string, timezone?: string): string {
  return safeLocaleString("toLocaleTimeString", startAt, timezone, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
