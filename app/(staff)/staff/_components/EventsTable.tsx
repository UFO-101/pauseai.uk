import { Fragment } from "react";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { importPath } from "@/lib/import-runs";
import type { EventHost, StaffEvent } from "@/lib/server/staff-events";
import {
  EVENT_SORTS,
  EVENTS_PAGE_SIZE,
  type EventsFound,
  type EventSort,
  type EventTab,
} from "@/lib/staff-events-list";
import { filtersPath, pageParam, type EventsSearch, type Params } from "@/lib/staff-search";
import { parseSort, sortHref } from "@/lib/staff-sort";
import { londonDate } from "@/lib/staff-time";
import AlertIcon from "./AlertIcon";
import { EventEdit, EventsEditing, type SaveEvent } from "./EventEdit";
import SortHeading from "./SortHeading";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Tabs from "./ui/Tabs";
import styles from "./EventsTable.module.css";
import ExternalLink from "./ui/ExternalLink";

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

/**
 * Who owns an event, by their address, in bold: free to break before its
 * @, so the column takes little room, leaving it to the hosts.
 */
function Owner({ owner, needed }: { owner: string | null; needed: boolean }) {
  if (!owner) return <Missing needed={needed}>{copy.noOwner}</Missing>;
  const [name, domain] = owner.split(/(?=@)/);
  return (
    <strong className={styles.owner}>
      {name}
      <wbr />
      {domain}
    </strong>
  );
}

/** An event's hosts, by name, in a line that wraps between them, each leading to their supporter's page once linked; never their email. */
function Hosts({ hosts }: { hosts: EventHost[] }) {
  return (
    <span className={styles.hosts}>
      {hosts.map((host, i) => {
        const name = host.name || <Muted>{copy.noHostName}</Muted>;
        return (
          <Fragment key={i}>
            {i > 0 && ", "}
            <span>
              {host.supporterId ? <StaffLink href={`/staff/supporters/${host.supporterId}`}>{name}</StaffLink> : name}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}

/** The link to an event's Google Doc, opening in a new tab, or a dash: many events never have one. */
function Doc({ doc }: { doc: string | null }) {
  if (!doc) return <Muted>–</Muted>;
  return <ExternalLink href={doc}>{copy.doc}</ExternalLink>;
}

/**
 * The events list's columns, in the order of a list read by time
 * (docs/style-guide.md, "Lists"): the day it starts; its name, leading to
 * it on Luma, marked when it's been taken off Luma; where it is, and its
 * Luma tags, which often say where too; how many are going; its hosts on
 * Luma, for staff who see supporters (`hosts`); then what we add, which
 * its Edit button changes, beside it: its owner and its Google Doc. On the
 * Future tab, one on Luma with no owner is an error. Every column but the tags, the hosts and Edit sorts; by the doc, those with
 * none come first.
 */
function eventColumns(
  search: EventsSearch,
  { staff, now, save, hosts }: { staff: readonly string[]; now: string; save: SaveEvent; hosts: boolean },
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
  // Still to come and on Luma, so an owner is needed.
  const needed = (event: StaffEvent) => event.startAt >= now && !event.removed;
  return [
    {
      key: "start",
      label: copy.columns.when,
      heading: heading("start", copy.columns.when),
      short: true,
      cell: (event) => londonDate(event.startAt),
    },
    {
      key: "name",
      label: copy.columns.name,
      heading: heading("name", copy.columns.name),
      cell: (event) => (
        <span className={styles.name}>
          <ExternalLink href={event.url}>{event.name}</ExternalLink>
          {event.removed && <Tag>{copy.removed}</Tag>}
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
      key: "going",
      label: copy.columns.going,
      heading: heading("going", copy.columns.going),
      short: true,
      cell: (event) => event.going,
    },
    ...(hosts
      ? [{ key: "hosts", label: copy.columns.hosts, cell: (event: StaffEvent) => <Hosts hosts={event.hosts} /> }]
      : []),
    {
      key: "owner",
      label: copy.owner,
      heading: heading("owner", copy.owner),
      cell: (event) => <Owner owner={event.owner} needed={needed(event)} />,
    },
    {
      key: "doc",
      label: copy.doc,
      heading: heading("doc", copy.doc),
      short: true,
      cell: (event) => <Doc doc={event.doc} />,
    },
    {
      key: "edit",
      label: "",
      end: true,
      cell: (event) => <EventEdit event={event} staff={staff} save={save} />,
    },
  ];
}

/**
 * The events the tab and filters find, in the list frame: a row each, in
 * the order chosen, and the way through the pages; when a search finds
 * none, but would among those taken off Luma, a link to them. Any staff
 * member can change an event's owner and doc, from its Edit button. Its
 * hosts are a column only for staff who see supporters (`hosts`).
 */
export default function EventsTable({
  found,
  search,
  staff,
  now,
  save,
  hosts,
}: {
  found: EventsFound;
  search: EventsSearch;
  staff: readonly string[];
  now: string;
  save: SaveEvent;
  hosts: boolean;
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
        columns={eventColumns(search, { staff, now, save, hosts })}
        rows={found.events}
        rowKey={(event) => event.id}
        empty={<Muted>{copy.noneFound}</Muted>}
      />
      {found.removed > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { removed: "yes" })}>
            {copy.removedMatches(found.removed)}
          </StaffLink>
        </p>
      )}
    </EventsEditing>
  );
}
