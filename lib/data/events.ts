export type LumaGeoAddressInfo = {
  city?: string;
  full_address?: string;
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

export async function getEvents(): Promise<LumaEntry[]> {
  try {
    const res = await fetch(
      "https://api2.luma.com/calendar/get-items?calendar_api_id=cal-Z327EhtiFdHuVie&pagination_limit=50&period=future",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export function formatEventDate(startAt: string, timezone?: string): string {
  const tz = timezone || "Europe/London";
  return new Date(startAt).toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatEventTime(startAt: string, timezone?: string): string {
  const tz = timezone || "Europe/London";
  return new Date(startAt).toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}
