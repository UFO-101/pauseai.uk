import "server-only";
import type { LumaEntry } from "@/lib/events";
import { outsideFetch } from "./outside-fetch";

/** Luma's own names for the two halves of a calendar. */
export type EventPeriod = "future" | "past";

/**
 * Luma returns "future" soonest-first and "past" most-recent-first, so both
 * arrive nearest-to-today first and neither needs sorting here.
 */
export async function getEvents(period: EventPeriod = "future"): Promise<LumaEntry[]> {
  try {
    const res = await outsideFetch(
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
