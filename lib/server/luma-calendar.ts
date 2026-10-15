import "server-only";
import type { LumaEntry, LumaGeoAddressInfo } from "@/lib/events";
import { outsideFetch } from "./outside-fetch";

/** The two halves of the calendar: from today on, and before today. */
export type EventPeriod = "future" | "past";

/** An event as Luma's official API lists it. Only the fields the site reads. */
type ApiEvent = {
  url?: string;
  name?: string;
  start_at?: string;
  timezone?: string;
  cover_url?: string;
  location_type?: string;
  visibility?: string;
  geo_address_json?: { address?: string; city?: string | null; region?: string | null; country?: string | null } | null;
};

/**
 * Our Luma calendar's events, through Luma's official API (LUMA_API_KEY,
 * scoped to the calendar). "future" is soonest first and "past" most recent
 * first, so both arrive nearest-to-today first.
 *
 * The split is at midnight UTC, so an event stays listed as upcoming for the
 * rest of its day. It also keeps the URL, and so Next's cached fetch, the same
 * all day.
 */
export async function getEvents(period: EventPeriod = "future"): Promise<LumaEntry[]> {
  const key = process.env.LUMA_API_KEY;
  if (!key) return [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const params = new URLSearchParams({
    [period === "future" ? "after" : "before"]: today.toISOString(),
    sort_column: "start_at",
    sort_direction: period === "future" ? "asc" : "desc",
    pagination_limit: "50",
  });
  // Events listed on our calendar but run from another (e.g. a local group's
  // own Luma calendar) only come back if asked for, as "view".
  params.append("access", "manage");
  params.append("access", "view");

  try {
    const res = await outsideFetch(`https://public-api.luma.com/v1/calendars/events/list?${params}`, {
      headers: { "x-luma-api-key": key, accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events: (ApiEvent | null)[] = data.entries ?? [];
    return events.flatMap((event) => {
      // The API key can see members-only and private events too; the site
      // lists only public ones. Rendering also assumes a url and start time
      // (EventList key, links, date formatting).
      if (event?.visibility !== "public" || !event.url || !event.start_at) return [];
      return [{ event: toLumaEvent(event, event.url, event.start_at) }];
    });
  } catch {
    return [];
  }
}

/** The shape the rest of the site uses: the event's slug as its url, and no location for an online event. */
function toLumaEvent(event: ApiEvent, url: string, start_at: string): LumaEntry["event"] {
  const geo = event.geo_address_json;
  return {
    url: /^https?:\/\//.test(url) ? new URL(url).pathname.replace(/^\//, "") : url,
    name: event.name ?? "",
    start_at,
    timezone: event.timezone,
    cover_url: event.cover_url,
    location_type: event.location_type,
    geo_address_info: geo
      ? { address: geo.address, city: geo.city ?? undefined, region: geo.region ?? undefined, country: geo.country ?? undefined }
      : undefined,
  };
}

/** An event as Luma's list-events endpoint gives it, with coordinates. */
type PlacedApiEvent = {
  url?: string;
  name?: string;
  start_at?: string;
  timezone?: string;
  cover_url?: string;
  location_type?: string;
  geo_address_json?: LumaGeoAddressInfo | null;
  geo_latitude?: number | string | null;
  geo_longitude?: number | string | null;
};

/** A coordinate from Luma, which may come as a number or a string. */
function degrees(value: number | string | null | undefined): number | undefined {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/**
 * Upcoming events with where each is, from Luma's official API, which,
 * unlike getEvents' endpoint, gives in-person events' coordinates.
 * Soonest first, in getEvents' shape, so EventList can show them.
 * Empty without LUMA_API_KEY, or if Luma fails.
 */
export async function getEventsWithPlaces(): Promise<LumaEntry[]> {
  const key = process.env.LUMA_API_KEY;
  if (!key) return [];
  // From the start of today, so the URL, and the cache, change once a day.
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await outsideFetch(`https://public-api.luma.com/v1/calendar/list-events?after=${today}T00:00:00Z&pagination_limit=50`, {
      headers: { "x-luma-api-key": key, accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.entries ?? []).flatMap((entry: { event?: PlacedApiEvent } | null): LumaEntry[] => {
      const event = entry?.event;
      if (!event?.url || !event.name || !event.start_at) return [];
      const latitude = degrees(event.geo_latitude);
      const longitude = degrees(event.geo_longitude);
      return [
        {
          event: {
            // Luma's URL is a full link; EventList adds lu.ma/ to a slug.
            url: event.url.replace(/^https?:\/\/[^/]+\//, ""),
            name: event.name,
            start_at: event.start_at,
            timezone: event.timezone,
            cover_url: event.cover_url,
            location_type: event.location_type,
            geo_address_info: event.geo_address_json ?? undefined,
            place: latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined,
          },
        },
      ];
    });
  } catch {
    return [];
  }
}
