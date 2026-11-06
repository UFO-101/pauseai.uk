import { staffCopy } from "@/lib/content/staff-interface";
import { NO_OWNER, ONLINE } from "@/lib/staff-events-list";
import type { SavedFiltersState } from "@/lib/server/saved-filters";
import { eventsSearch, firstOf, type EventsSearch, type Params } from "@/lib/staff-search";
import { eventFiltersOf } from "./EventsTable";
import FilterBar, { filteredName, filterWords, type Filter } from "./ui/FilterBar";
import { savedFiltersProps, type SavedFilterActions } from "./ui/SavedFilters";

/** The choices the events list's filters offer: every staff account, and every tag and city our events have. */
export type EventChoices = { staff: readonly string[]; tags: string[]; cities: string[] };

/**
 * The events list's filters, in its columns' order: where it is, a city
 * or online; its tags; its owner, or none; and taken off Luma, which
 * finds only those, as the list leaves them out otherwise, as the
 * politicians list does test politicians. All but the last can be chosen
 * more than once.
 */
function eventFilters({ staff, tags, cities }: EventChoices): Filter[] {
  const copy = staffCopy.events;
  return [
    {
      name: "place",
      label: copy.filters.place,
      repeat: true,
      options: [...cities.map((city) => ({ value: city, label: city })), { value: ONLINE, label: copy.online }],
    },
    {
      name: "tag",
      label: copy.filters.tag,
      repeat: true,
      options: tags.map((tag) => ({ value: tag, label: tag })),
    },
    {
      name: "owner",
      label: copy.owner,
      repeat: true,
      options: [{ value: NO_OWNER, label: copy.noOwner }, ...staff.map((email) => ({ value: email, label: email }))],
    },
    {
      name: "removed",
      label: copy.removed,
      options: Object.entries(copy.filters.removed).map(([value, label]) => ({ value, label })),
    },
  ];
}

/** The events list's search and filters that are on, in words, as their chips say them. */
export function eventWords(search: EventsSearch, choices: EventChoices): string[] {
  return filterWords(eventFilters(choices), eventFiltersOf(search), "q");
}

/** A saved filter of the events list, in words: the Past tab, if it's on, and its search and filters. */
function savedEventWords(params: Params, choices: EventChoices): string[] {
  const past = firstOf(params.when) === "past" ? [staffCopy.events.tabs.past] : [];
  return [...past, ...eventWords(eventsSearch(params), choices)];
}

/** Search and filter the events list, keeping its tab, with its `saved` filters. */
export default function EventFilters({
  search,
  choices,
  saved,
}: {
  search: EventsSearch;
  choices: EventChoices;
  saved?: { state: SavedFiltersState; actions: SavedFilterActions };
}) {
  return (
    <FilterBar
      path="/staff/events"
      values={eventFiltersOf(search)}
      search={{ name: "q", label: staffCopy.events.filters.search }}
      filters={eventFilters(choices)}
      keep={["when"]}
      saved={
        saved &&
        savedFiltersProps({
          ...saved,
          list: "events",
          values: eventFiltersOf(search),
          path: "/staff/events",
          name: filteredName(staffCopy.events.title, eventWords(search, choices)),
          summary: (params) => savedEventWords(params, choices),
        })
      }
    />
  );
}
