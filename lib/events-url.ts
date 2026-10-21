// The home page's events in a link: ?events=oxford for a local group's,
// ?events=online for the online ones. Only those go in the URL. A place,
// from a postcode or the device's location, says where someone is, so it
// stays out of the address bar, the browser's history and anything copied.

import type { LocalGroup } from "@/lib/content/local-groups";
import { ANYWHERE, type EventsWhere } from "@/lib/events";

/** The query parameter, and the id of the events section a link with it scrolls to. */
export const EVENTS_PARAM = "events";
const ONLINE = "online";

/** What the home page's events show: where in-person ones are near, or only the online ones. */
export type EventsShowing = { where: EventsWhere; onlineOnly: boolean };

/** A local group's value in the link: its page's path without the slash, "oxford". */
const slugOf = (group: LocalGroup) => group.href.slice(1);

/** What a link's query asks to show, if it asks for a local group or online. */
export function eventsFromQuery(search: string, groups: readonly LocalGroup[]): EventsShowing | undefined {
  const value = new URLSearchParams(search).get(EVENTS_PARAM);
  if (value === ONLINE) return { where: ANYWHERE, onlineOnly: true };
  const group = groups.find((g) => slugOf(g) === value);
  return group ? { where: { kind: "group", name: group.name }, onlineOnly: false } : undefined;
}

/** The query value for what's shown, or undefined when it's anywhere or a place, which no link carries. */
export function eventsQueryValue(showing: EventsShowing, groups: readonly LocalGroup[]): string | undefined {
  if (showing.onlineOnly) return ONLINE;
  if (showing.where.kind !== "group") return undefined;
  const { name } = showing.where;
  return slugOf(groups.find((g) => g.name === name)!);
}

/** `url` with the query for what's shown, scrolled to the events when there is one. */
export function withEventsQuery(url: URL, showing: EventsShowing, groups: readonly LocalGroup[]): URL {
  const next = new URL(url);
  const value = eventsQueryValue(showing, groups);
  if (value) {
    next.searchParams.set(EVENTS_PARAM, value);
    next.hash = EVENTS_PARAM;
  } else {
    next.searchParams.delete(EVENTS_PARAM);
  }
  return next;
}
