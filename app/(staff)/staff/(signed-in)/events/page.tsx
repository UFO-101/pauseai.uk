import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { eventsPage } from "@/lib/server/staff-events";
import { savedFiltersState } from "@/lib/server/saved-filters";
import { requireStaff } from "@/lib/server/staff-auth";
import { eventsSearch, type EventsSearch } from "@/lib/staff-search";
import { saveEventNow } from "../../actions";
import { deleteFilter, renameFilter, saveFilter, updateFilter } from "../../saved-filter-actions";
import EventFilters, { eventWords } from "../../_components/EventFilters";
import EventsTable, { EventsSource, EventTabs } from "../../_components/EventsTable";
import { filteredTitle } from "../../_components/ui/FilterBar";
import PageTitle from "../../_components/ui/PageTitle";

type Props = { searchParams: Promise<Partial<EventsSearch>> };

/** The list's title, with its filters. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const staff = await requireStaff();
  const { filter, ...search } = eventsSearch((await savedFiltersState("events", await searchParams)).params);
  const page = await eventsPage(filter, staff.permissions.includes("supporters"));
  return { title: filteredTitle(staffCopy.events.title, eventWords(search, page)) };
}

/** Our events, to come or past, filtered, each with its owner and Google Doc, and its hosts for those who see supporters. */
export default async function EventsPage({ searchParams }: Props) {
  const hosts = (await requireStaff()).permissions.includes("supporters");
  const saved = await savedFiltersState("events", await searchParams);
  const { filter, ...search } = eventsSearch(saved.params);
  const { events, total, pages, removed, staff, tags, cities, now } = await eventsPage(filter, hosts);
  return (
    <>
      <PageTitle action={<EventsSource />}>{staffCopy.events.title}</PageTitle>
      <EventTabs search={search} />
      <EventFilters
        search={search}
        choices={{ staff, tags, cities }}
        saved={{
          state: saved,
          actions: { save: saveFilter, update: updateFilter, rename: renameFilter, remove: deleteFilter },
        }}
      />
      <EventsTable
        found={{ events, total, pages, removed }}
        search={search}
        staff={staff}
        now={now}
        save={saveEventNow}
        hosts={hosts}
      />
    </>
  );
}
