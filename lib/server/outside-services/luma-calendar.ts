import "server-only";
import type { LumaEvent } from "@/lib/events";
import { now } from "@/lib/now";
import { LUMA_PAGE_SIZE, lumaList, type LumaPage } from "./luma-api";
import { outsideFetch } from "./outside-fetch";

/** The two halves of the calendar: from today on, and before today. */
export type EventPeriod = "future" | "past";

/** An event as Luma's official API lists it. Only the fields the site reads. */
type ApiEvent = {
  id?: string;
  api_id?: string;
  access?: string;
  url?: string;
  name?: string;
  start_at?: string;
  timezone?: string;
  cover_url?: string;
  location_type?: string;
  visibility?: string;
  geo_address_json?: { address?: string; city?: string | null; region?: string | null; country?: string | null } | null;
  coordinate?: { latitude?: number; longitude?: number } | null;
  /** "guests-only" when only those registered should see where it is. */
  location_visibility?: string;
};

/** `date` moved back to midnight UTC. */
function startOfDay(date: Date): Date {
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Our Luma calendar's events, through Luma's official API (LUMA_API_KEY,
 * scoped to the calendar). "future" is soonest first and "past" most recent
 * first, so both arrive nearest-to-today first.
 *
 * The split is at midnight UTC, so an event stays listed as upcoming for the
 * rest of its day. It also keeps the URL, and so Next's cached fetch, the same
 * all day.
 */
export async function getEvents(period: EventPeriod = "future"): Promise<LumaEvent[]> {
  const key = process.env.LUMA_API_KEY;
  if (!key) return [];

  const today = startOfDay(now());
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
      return [toLumaEvent(event, event.url, event.start_at)];
    });
  } catch {
    return [];
  }
}

/**
 * The shape the rest of the site uses: the event's slug as its url, no
 * location for an online event, and where an in-person one is when Luma knows.
 *
 * The API key sees the venue even when it's for guests only; then the site
 * gives just the town, so the event still shows as in person, and no place.
 */
function toLumaEvent(event: ApiEvent, url: string, start_at: string): LumaEvent {
  const geo = event.geo_address_json;
  const guestsOnly = event.location_visibility === "guests-only";
  const coordinate = guestsOnly ? undefined : event.coordinate;
  return {
    url: /^https?:\/\//.test(url) ? new URL(url).pathname.replace(/^\//, "") : url,
    name: event.name ?? "",
    start_at,
    timezone: event.timezone,
    cover_url: event.cover_url,
    location_type: event.location_type,
    geo_address_info: geo
      ? {
          address: guestsOnly ? undefined : geo.address,
          city: geo.city ?? undefined,
          region: geo.region ?? undefined,
          country: geo.country ?? undefined,
        }
      : undefined,
    place:
      typeof coordinate?.latitude === "number" && typeof coordinate.longitude === "number"
        ? { latitude: coordinate.latitude, longitude: coordinate.longitude }
        : undefined,
  };
}

/** An event as the import keeps it: the site's shape, plus Luma's ID and whether we manage it. */
export type CalendarEvent = LumaEvent & {
  id: string;
  /** 'manage' for our own events; 'view' for one another calendar runs, whose guests Luma doesn't show us. */
  access: "manage" | "view";
};

/**
 * One page of every public event on our calendar, newest first, managed by us
 * or listed from another calendar, for the import. Throws as lumaList does.
 */
export async function listCalendarEvents(cursor?: string): Promise<LumaPage<CalendarEvent>> {
  const params = new URLSearchParams({
    sort_column: "start_at",
    sort_direction: "desc",
    pagination_limit: String(LUMA_PAGE_SIZE),
  });
  params.append("access", "manage");
  params.append("access", "view");
  if (cursor) params.set("pagination_cursor", cursor);
  const page = await lumaList<ApiEvent | null>("/v1/calendars/events/list", params);
  return {
    ...page,
    entries: page.entries.flatMap((event) => {
      const id = event?.id ?? event?.api_id;
      if (event?.visibility !== "public" || !id || !event.url || !event.start_at) return [];
      return [
        { ...toLumaEvent(event, event.url, event.start_at), id, access: event.access === "view" ? "view" : "manage" },
      ];
    }),
  };
}

/** A contact of the calendar, and since when. */
export type CalendarContact = { userId: string; email: string; name: string; createdAt: string };

type ApiContact = { id?: string; user_id?: string; email?: string; name?: string | null; created_at?: string } | null;

/** One page of the calendar's contacts, newest first, for the import. Throws as lumaList does. */
export async function listCalendarContacts(cursor?: string): Promise<LumaPage<CalendarContact>> {
  const params = new URLSearchParams({
    sort_column: "created_at",
    sort_direction: "desc",
    pagination_limit: String(LUMA_PAGE_SIZE),
  });
  if (cursor) params.set("pagination_cursor", cursor);
  const page = await lumaList<ApiContact>("/v1/calendars/contacts/list", params);
  return {
    ...page,
    entries: page.entries.flatMap((contact) => {
      const userId = contact?.user_id ?? contact?.id;
      if (!userId || !contact?.email || !contact.created_at) return [];
      return [{ userId, email: contact.email, name: contact.name ?? "", createdAt: contact.created_at }];
    }),
  };
}
