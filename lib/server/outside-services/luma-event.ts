import "server-only";
import { lumaGet, type LumaPage } from "./luma-api";

// One of our events' hosts, from Luma's details of the event (GET
// /v1/events/get), for the import: the calendar's list of events doesn't
// have them. Every event has at least one, its creator. Luma gives them for
// events our calendar manages.

/** A host as the import keeps them: their Luma user ID, email and name, empty if Luma has none. */
export type EventHost = { userId: string; email: string; name: string };

type ApiHost = { id?: string; email?: string | null; name?: string | null } | null;

/**
 * An event's hosts, as a page of one, for the import's budget, which counts
 * the request and notes Luma's rate limit. A host without an ID or an email
 * is skipped. Throws as lumaGet does.
 */
export async function getEventHosts(eventId: string): Promise<LumaPage<EventHost>> {
  const { data, remaining } = await lumaGet<{ hosts?: ApiHost[] }>(
    "/v1/events/get",
    new URLSearchParams({ event_id: eventId }),
  );
  return {
    entries: (data.hosts ?? []).flatMap((host) =>
      host?.id && host.email ? [{ userId: host.id, email: host.email, name: host.name ?? "" }] : [],
    ),
    remaining,
  };
}
