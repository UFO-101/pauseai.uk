import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { eventsPage } from "@/lib/server/staff-events";
import { requireStaff } from "@/lib/server/staff-auth";
import { eventsSearch, type EventsSearch } from "@/lib/staff-search";
import { saveEventNow } from "../../actions";
import EventFilters, { eventWords } from "../../_components/EventFilters";
import EventsTable, { EventsSource, EventTabs } from "../../_components/EventsTable";
import { filteredTitle } from "../../_components/ui/FilterBar";
import PageTitle from "../../_components/ui/PageTitle";

type Props = { searchParams: Promise<Partial<EventsSearch>> };

/** The list's title, with its filters. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff();
  const { filter, ...search } = eventsSearch(await searchParams);
  return { title: filteredTitle(staffCopy.events.title, eventWords(search, await eventsPage(filter))) };
}

/** Our events, to come or past, filtered, each with its owner and Google Doc. */
export default async function EventsPage({ searchParams }: Props) {
  await requireStaff();
  const { filter, ...search } = eventsSearch(await searchParams);
  const { events, total, pages, staff, tags, cities, now } = await eventsPage(filter);
  return (
    <>
      <PageTitle action={<EventsSource />}>{staffCopy.events.title}</PageTitle>
      <EventTabs search={search} />
      <EventFilters search={search} choices={{ staff, tags, cities }} />
      <EventsTable found={{ events, total, pages }} search={search} staff={staff} now={now} save={saveEventNow} />
    </>
  );
}
