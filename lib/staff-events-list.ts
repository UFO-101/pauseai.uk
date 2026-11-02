// The staff events list's tabs, filters and sorts, applied to our events
// as lib/server/staff-events.ts lists them. There are few enough events
// to filter and sort them all here, rather than in SQL.
import type { StaffEvent } from "@/lib/server/staff-events";
import type { SortColumns, SortSpec } from "@/lib/staff-sort";

/** The list's tabs: events still to come, and those past. */
export const EVENT_TABS = ["future", "past"] as const;
export type EventTab = (typeof EVENT_TABS)[number];

/**
 * Each tab's sortable columns, each with the direction a first click
 * gives: by default, those to come soonest first, those past latest first.
 */
export const EVENT_SORTS: Record<EventTab, SortColumns<EventSort>> = {
  future: { start: "asc", name: "asc", place: "asc", going: "desc", owner: "asc" },
  past: { start: "desc", name: "asc", place: "asc", going: "desc", owner: "asc" },
};
export type EventSort = "start" | "name" | "place" | "going" | "owner";

export const EVENTS_PAGE_SIZE = 100;

/** The Owner filter's choice for events with no owner. */
export const NO_OWNER = "none";
/** The Place filter's choice for events online, which have no city. */
export const ONLINE = "online";
/** What the Missing filter finds events without. */
export const EVENT_MISSING = ["owner", "doc"] as const;
export type EventMissing = (typeof EVENT_MISSING)[number];

/** The filters of the events list that repeat, which can leave out as well as find. */
type NegatableEventFilter = "owner" | "tag" | "place" | "missing";

/** Which events the list shows. A filter that repeats finds those with any of its values. */
export type EventFilter = {
  tab: EventTab;
  /** Over the event's name. */
  search?: string;
  /** Staff emails, or NO_OWNER. */
  owner?: string[];
  /** Luma tags. */
  tag?: string[];
  /** Cities, or ONLINE. */
  place?: string[];
  missing?: EventMissing[];
  /** Whether it's been taken off Luma. */
  removed?: boolean;
  /** Those with none of these, each a filter above that repeats. */
  not?: Pick<EventFilter, NegatableEventFilter>;
  sort: SortSpec<EventSort>;
  page: number;
};

/** One page of the events a filter finds, how many it finds in all, and how many pages they fill. */
export type EventsFound = { events: StaffEvent[]; total: number; pages: number };

/** An event's values for each filter that repeats: its owner, its tags, where it is, and what it lacks. */
function valuesFor(event: StaffEvent): Record<NegatableEventFilter, string[]> {
  return {
    owner: [event.owner ?? NO_OWNER],
    tag: event.tags,
    place: [event.city ?? ONLINE],
    missing: [!event.owner && "owner", !event.doc && "doc"].filter((value) => value !== false),
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

/** What an event sorts by, for a column: when, its name, where, how many are going, or its owner. */
function sortValue(event: StaffEvent, key: EventSort): string | number {
  if (key === "going") return event.going;
  if (key === "name") return event.name.toLowerCase();
  if (key === "place") return (event.city ?? "").toLowerCase();
  if (key === "owner") return event.owner ?? "";
  return event.startAt;
}

/**
 * The events `filter` finds of `events`, its tab's, to come or past at
 * `now`, sorted, one page of them; any tie, by when it starts, in the
 * tab's own direction, then by ID.
 */
export function findEvents(events: readonly StaffEvent[], filter: EventFilter, now: string): EventsFound {
  const search = filter.search?.toLowerCase();
  const found = events.filter(
    (event) =>
      event.startAt >= now === (filter.tab === "future") &&
      (!search || event.name.toLowerCase().includes(search)) &&
      (filter.removed === undefined || event.removed === filter.removed) &&
      passes(event, filter),
  );
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
  };
}
