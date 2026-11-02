import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { importPath } from "@/lib/import-runs";
import type { StaffEvent } from "@/lib/server/staff-events";
import {
  EVENT_SORTS,
  EVENTS_PAGE_SIZE,
  type EventsFound,
  type EventSort,
  type EventTab,
} from "@/lib/staff-events-list";
import { filtersPath, pageParam, type EventsSearch, type Params } from "@/lib/staff-search";
import { parseSort, sortHref } from "@/lib/staff-sort";
import { londonStart } from "@/lib/staff-time";
import AlertIcon from "./AlertIcon";
import { DocField, EventEditButtons, EventsEditing, OwnerField, type SaveEvent } from "./EventEdit";
import SortHeading from "./SortHeading";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Tabs from "./ui/Tabs";
import styles from "./EventsTable.module.css";

const PATH = "/staff/events";
const copy = staffCopy.events;

/**
 * At the page's top right, quietly, as on a politician's page: where the
 * events come from, Luma, leading to its import's page.
 */
export function EventsSource() {
  return (
    <p className={styles.source}>
      {copy.source.label} <StaffLink href={importPath("import-luma")}>{copy.source.link}</StaffLink>
    </p>
  );
}

/** The list's tab: Past, or Future for anything else. */
function eventTab(search: Pick<EventsSearch, "when">): EventTab {
  return search.when === "past" ? "past" : "future";
}

/** The list's filters as typed, the URL's, without the page. */
export function eventFiltersOf(search: EventsSearch): Params {
  const { page, filter, ...rest } = search as EventsSearch & { filter?: unknown };
  void page;
  void filter;
  return rest;
}

/** The Future and Past tabs, keeping the filters, each in its own default order. */
export function EventTabs({ search }: { search: EventsSearch }) {
  const filters = { ...eventFiltersOf(search), sort: "", dir: "" };
  return (
    <Tabs
      label={copy.tabs.label}
      tabs={[
        { key: "future", label: copy.tabs.future, href: filtersPath(PATH, filters, { when: "" }) },
        { key: "past", label: copy.tabs.past, href: filtersPath(PATH, filters, { when: "past" }) },
      ]}
      current={eventTab(search)}
    />
  );
}

/**
 * What an event lacks, said: an error, in red, with a warning, when it's
 * still to come and on Luma (`needed`), as someone must see to it;
 * otherwise only said, in grey.
 */
function Missing({ needed, children }: { needed: boolean; children: string }) {
  if (!needed) return <Muted>{children}</Muted>;
  return (
    <span className={styles.missing}>
      <AlertIcon tone="red" />
      {children}
    </span>
  );
}

/** Who owns an event, by their address, in bold; on hover too, if it's too long for its column. */
function Owner({ owner, needed }: { owner: string | null; needed: boolean }) {
  if (!owner) return <Missing needed={needed}>{copy.noOwner}</Missing>;
  return (
    <strong className={styles.owner} title={owner}>
      {owner}
    </strong>
  );
}

/** The link to an event's Google Doc, opening in a new tab. */
function Doc({ doc, needed }: { doc: string | null; needed: boolean }) {
  if (!doc) return <Missing needed={needed}>{copy.noDoc}</Missing>;
  return (
    <a href={doc} target="_blank" rel="noreferrer">
      {copy.doc}
    </a>
  );
}

/**
 * The events list's columns: when it starts; its name, leading to it on
 * Luma, marked when it's been taken off Luma; its Luma tags; where it is;
 * how many are going; its owner; its Google Doc; and its Edit button, which
 * puts the fields for its owner and doc in their cells. On the Future tab,
 * one on Luma with no owner or no doc is an error. Every column but the
 * tags, the doc and Edit sorts.
 */
function eventColumns(
  search: EventsSearch,
  { staff, now, save }: { staff: readonly string[]; now: string; save: SaveEvent },
): ListColumn<StaffEvent>[] {
  const tab = eventTab(search);
  const sort = parseSort(EVENT_SORTS[tab], "start", search.sort, search.dir);
  const heading = (key: EventSort, label: string) => (
    <SortHeading
      key={key}
      sortKey={key}
      current={sort}
      href={sortHref(PATH, eventFiltersOf(search), EVENT_SORTS[tab], sort, key)}
    >
      {label}
    </SortHeading>
  );
  // Still to come and on Luma, so an owner and a doc are needed.
  const needed = (event: StaffEvent) => event.startAt >= now && !event.removed;
  return [
    {
      key: "start",
      label: copy.columns.when,
      heading: heading("start", copy.columns.when),
      short: true,
      cell: (event) => londonStart(event.startAt),
    },
    {
      key: "name",
      label: copy.columns.name,
      heading: heading("name", copy.columns.name),
      cell: (event) => (
        <span className={styles.name}>
          <a href={event.url}>{event.name}</a>
          {event.removed && <Tag>{copy.removed}</Tag>}
        </span>
      ),
    },
    {
      key: "tags",
      label: copy.columns.tags,
      cell: (event) => (
        <span className={styles.tags}>
          {event.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      ),
    },
    {
      key: "place",
      label: copy.columns.place,
      heading: heading("place", copy.columns.place),
      short: true,
      cell: (event) => event.city ?? copy.online,
    },
    {
      key: "going",
      label: copy.columns.going,
      heading: heading("going", copy.columns.going),
      short: true,
      cell: (event) => event.going,
    },
    {
      key: "owner",
      label: copy.owner,
      heading: heading("owner", copy.owner),
      className: styles.ownerCell,
      cell: (event) => (
        <OwnerField event={event} staff={staff}>
          <Owner owner={event.owner} needed={needed(event)} />
        </OwnerField>
      ),
    },
    {
      key: "doc",
      label: copy.doc,
      short: true,
      cell: (event) => (
        <DocField event={event}>
          <Doc doc={event.doc} needed={needed(event)} />
        </DocField>
      ),
    },
    {
      key: "edit",
      label: "",
      end: true,
      cell: (event) => <EventEditButtons event={event} save={save} />,
    },
  ];
}

/**
 * The events the tab and filters find, in the list frame: a row each, in
 * the order chosen, and the way through the pages. Any staff member can
 * change an event's owner and doc, from its Edit button.
 */
export default function EventsTable({
  found,
  search,
  staff,
  now,
  save,
}: {
  found: EventsFound;
  search: EventsSearch;
  staff: readonly string[];
  now: string;
  save: SaveEvent;
}) {
  const filters = eventFiltersOf(search);
  return (
    <EventsEditing>
      <ListFrame
        count={copy.total(found.total)}
        total={found.total}
        page={Number(search.page) || 1}
        pages={found.pages}
        pageSize={EVENTS_PAGE_SIZE}
        href={(n) => filtersPath(PATH, filters, pageParam(n))}
        align="middle"
        columns={eventColumns(search, { staff, now, save })}
        rows={found.events}
        rowKey={(event) => event.id}
        empty={<Muted>{copy.noneFound}</Muted>}
      />
    </EventsEditing>
  );
}
