// The staff events list's tabs, filters and sorts, applied to our events
// as lib/server/staff-events.ts lists them. There are few enough events
// to filter and sort them all here, rather than in SQL.
import type { SearchedEvent, StaffEvent } from "@/lib/server/staff-events";
import { windowStart } from "@/lib/staff-dashboard";
import type { SortColumns, SortSpec } from "@/lib/staff-sort";

/** The list's tabs: events still to come, and those past. */
export const EVENT_TABS = ["future", "past"] as const;
export type EventTab = (typeof EVENT_TABS)[number];

/**
 * Each tab's sortable columns, each with the direction a first click
 * gives: by default, those to come soonest first, those past latest first.
 */
export const EVENT_SORTS: Record<EventTab, SortColumns<EventSort>> = {
  future: { start: "asc", name: "asc", place: "asc", going: "desc", owner: "asc", doc: "asc" },
  past: { start: "desc", name: "asc", place: "asc", going: "desc", owner: "asc", doc: "asc" },
};
export type EventSort = "start" | "name" | "place" | "going" | "owner" | "doc";

export const EVENTS_PAGE_SIZE = 100;

/** The Owner filter's choice for events with no owner. */
export const NO_OWNER = "none";
/** The Place filter's choice for events online, which have no city. */
export const ONLINE = "online";

/** The filters of the events list that repeat, which can leave out as well as find. */
type NegatableEventFilter = "owner" | "tag" | "place";

/** Which events the list shows. A filter that repeats finds those with any of its values. */
export type EventFilter = {
  tab: EventTab;
  /** Over the event's name, its hosts' names and emails, and its owner's email. */
  search?: string;
  /** Staff emails, or NO_OWNER. */
  owner?: string[];
  /** Luma tags. */
  tag?: string[];
  /** Cities, or ONLINE. */
  place?: string[];
  /** Only those taken off Luma, or, by default, only those still on it. */
  removed: boolean;
  /** Only those that started in the last so many days. */
  heldDays?: number;
  /** Those with none of these, each a filter above that repeats. */
  not?: Pick<EventFilter, NegatableEventFilter>;
  sort: SortSpec<EventSort>;
  page: number;
};

/**
 * One page of the events a filter finds, how many it finds in all, and how
 * many pages they fill; and when a search finds none, how many it would
 * among those taken off Luma, which the list leaves out by default.
 */
export type EventsFound = { events: StaffEvent[]; total: number; pages: number; removed: number };

/** An event's values for each filter that repeats: its owner, its tags, and where it is. */
function valuesFor(event: StaffEvent): Record<NegatableEventFilter, string[]> {
  return {
    owner: [event.owner ?? NO_OWNER],
    tag: event.tags,
    place: [event.city ?? ONLINE],
  };
}

/** Whether an event passes a filter's repeating parts: has any of each one's values, and none of what's left out. */
function passes(event: StaffEvent, filter: EventFilter): boolean {
  const values = valuesFor(event);
  return (Object.keys(values) as NegatableEventFilter[]).every((name) => {
    const any = filter[name];
    const none = filter.not?.[name];
    return (
      (!any || any.some((value) => values[name].includes(value))) &&
      !none?.some((value) => values[name].includes(value))
    );
  });
}

/** What an event sorts by, for a column: when, its name, where, how many are going, its owner, or its doc, none first. */
function sortValue(event: StaffEvent, key: EventSort): string | number {
  if (key === "going") return event.going;
  if (key === "name") return event.name.toLowerCase();
  if (key === "place") return (event.city ?? "").toLowerCase();
  if (key === "owner") return event.owner ?? "";
  if (key === "doc") return event.doc ?? "";
  return event.startAt;
}

/** Whether a search finds an event: in its name, its hosts' names or emails, or its owner's email. */
function searchFinds(event: SearchedEvent, search: string): boolean {
  return [event.name, ...event.hosts.map((host) => host.name), ...event.hostEmails, event.owner ?? ""].some((text) =>
    text.toLowerCase().includes(search),
  );
}

/**
 * The events `filter` finds of `events`, its tab's, to come or past at
 * `now`, sorted, one page of them; any tie, by when it starts, in the
 * tab's own direction, then by ID.
 */
export function findEvents<E extends SearchedEvent>(
  events: readonly E[],
  filter: EventFilter,
  now: string,
): Omit<EventsFound, "events"> & { events: E[] } {
  const search = filter.search?.toLowerCase();
  const heldSince = filter.heldDays && windowStart(filter.heldDays);
  const matching = (removed: boolean) =>
    events.filter(
      (event) =>
        event.startAt >= now === (filter.tab === "future") &&
        (!heldSince || (event.startAt >= heldSince && event.startAt <= now)) &&
        (!search || searchFinds(event, search)) &&
        event.removed === removed &&
        passes(event, filter),
    );
  const found = matching(filter.removed);
  const order = (a: string | number, b: string | number, dir: string) =>
    (a < b ? -1 : a > b ? 1 : 0) * (dir === "asc" ? 1 : -1);
  const startDir = EVENT_SORTS[filter.tab].start;
  found.sort(
    (a, b) =>
      order(sortValue(a, filter.sort.key), sortValue(b, filter.sort.key), filter.sort.dir) ||
      order(a.startAt, b.startAt, startDir) ||
      order(a.id, b.id, "asc"),
  );
  const pages = Math.max(1, Math.ceil(found.length / EVENTS_PAGE_SIZE));
  return {
    events: found.slice((filter.page - 1) * EVENTS_PAGE_SIZE, filter.page * EVENTS_PAGE_SIZE),
    total: found.length,
    pages,
    removed: search && found.length === 0 && !filter.removed ? matching(true).length : 0,
  };
}
