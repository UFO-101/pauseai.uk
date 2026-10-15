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
  /** Where it is, when Luma knows. */
  place?: Place;
};

/** A point on the map, in degrees. */
export type Place = { latitude: number; longitude: number };

export type LumaEntry = {
  event: LumaEvent;
};

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
 * (see lib/content/local-groups.ts).
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

/**
 * Events with no `geo_address_info` — Luma's signal for "online" rather than
 * pinned to a place (see the "Online" fallback in EventList) — that aren't
 * already claimed by a specific local group's `eventMatchers` (e.g. "PauseAI
 * Scotland Meeting" belongs on Glasgow's page via its own eventMatchers, not
 * in every other group's generic online list too). What's left is open to
 * everyone in the UK, so local group pages show it alongside their local
 * events rather than only on the homepage.
 */
export function filterOnlineEvents(
  entries: LumaEntry[],
  allEventMatchers: readonly (readonly string[])[]
): LumaEntry[] {
  return entries.filter((entry) => {
    if (entry.event.geo_address_info) return false;
    const haystack = normalise(entry.event.name);
    return !allEventMatchers.some((matchers) =>
      matchers.some((matcher) => haystack.includes(normalise(matcher)))
    );
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

/** The distance between two places, in kilometres, along the Earth's surface (the haversine formula). */
export function distanceKm(a: Place, b: Place): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const h =
    Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** How near an event must be to count as near someone: about an hour away. (Oxford to central London is 83km.) */
export const NEAR_KM = 50;

/**
 * The events to suggest to someone at `here`, from a soonest-first list:
 * `count` of them, EventList's one row of four. The next few in person
 * within NEAR_KM, leaving room for at least one online, then the next online
 * ones to fill the row. With none near, or nowhere to measure from, all
 * online, which anyone can join. Online is no address, as in EventList; an
 * in-person event with no place (no venue set yet) is never near, as its
 * distance isn't known.
 */
export function eventsNear(entries: LumaEntry[], here: Place | null | undefined, count = 4): LumaEntry[] {
  const online = entries.filter((entry) => !entry.event.geo_address_info);
  const near = here
    ? entries.filter(({ event }) => event.geo_address_info && event.place && distanceKm(here, event.place) <= NEAR_KM).slice(0, count - 1)
    : [];
  return [...near, ...online.slice(0, count - near.length)].sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
}
