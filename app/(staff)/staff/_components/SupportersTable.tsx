import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { contactState, type Channel, type ContactState } from "@/lib/contact-permissions";
import type { SupportersPage } from "@/lib/server/supporters";
import { campaignBySlug } from "@/lib/email-your-mp";
import { anyAndNone, filtersPath, pageParam, valuesOf, type Params, type SupportersSearch } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import { parseSort, sortHref } from "@/lib/staff-sort";
import {
  registrationStatus,
  SUPPORTER_SORTS,
  SUPPORTERS_PAGE_SIZE,
  type SupporterPlaceName,
  type SupporterRow,
  type SupporterSort,
} from "@/lib/supporters";
import SortHeading from "./SortHeading";
import SubscriptionBadges, { subscriptionWords } from "./SubscriptionBadges";
import SupporterBadges, { supporterBadgeWords } from "./SupporterBadges";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import type { Contact } from "@/lib/vcard";
import styles from "./SupportersTable.module.css";

const PATH = "/staff/supporters";
const copy = staffCopy.supporters;

/** The list's filters as typed, the URL's, without the page or the notice. */
export function supporterFiltersOf(search: SupportersSearch): Params {
  const { page, erased, filter, ...rest } = search as SupportersSearch & { filter?: unknown };
  void page;
  void erased;
  void filter;
  return rest;
}

/** Where a supporter is: faint when it's only where an event they went to was. */
function Place({ place }: { place: SupporterPlaceName }) {
  return place.basis === "event" ? <Muted>{place.name}</Muted> : place.name;
}

/** The answers the Contact filter finds, but those it leaves out. */
function contactStates(search: Pick<SupportersSearch, "contact">): ContactState[] {
  return anyAndNone(valuesOf(search.contact), (values) => values.flatMap((v) => contactState(v) ?? []))[0] ?? [];
}

/**
 * A supporter's addresses, or numbers, by `channel`, that have an answer
 * the Contact filter finds (`states`), each once.
 */
function contactsFound(states: ContactState[], channel: Channel, s: SupporterRow): string[] {
  const found = s.permissions.filter(
    (p) =>
      p.channel === channel &&
      states.some(
        (state) =>
          state.channel === channel &&
          (!state.topic || state.topic === p.topic) &&
          (!state.send || state.send === p.send) &&
          (!state.reason || state.reason === p.reason),
      ),
  );
  return [...new Set(found.map((p) => p.address))];
}

/** The nation a supporter's place is in, in words, or null where we don't know it. */
function nationOf(s: SupporterRow): string | null {
  return s.place?.country ? staffCopy.countries[s.place.country] : null;
}

/** Addresses or numbers in a cell, a line each. */
function Addresses({ addresses }: { addresses: string[] }) {
  return addresses.map((address) => <div key={address}>{address}</div>);
}

/**
 * The supporters list's columns: who they are (their name; with the
 * Subscriptions filter by email or phone, their addresses or numbers whose
 * answer it finds; where they are); what they are to us and what we'd
 * email them about, as lozenges;
 * how many events and letters; and when we first saw them and last saw
 * them do something. The Nation filter, leaving some out or finding more
 * than one, adds the nation they're in, after where they are. The Event
 * filter, finding those at events, adds how
 * each registration for them stands, named when there's more than one
 * event; the Campaign filter, finding those who wrote, when they first
 * wrote in it. A download has the same columns.
 */
export function supporterColumns(search: SupportersSearch): ListColumn<SupporterRow>[] {
  const [events] = anyAndNone(valuesOf(search.event), (values) => values);
  const [nations, notNations] = anyAndNone(valuesOf(search.nation), (values) => values);
  const states = contactStates(search);
  const named = (events?.length ?? 0) > 1;
  const wrote = Boolean(campaignBySlug(search.campaign)) && search.wrote !== "no";
  const sort = parseSort(SUPPORTER_SORTS, "active", search.sort, search.dir);
  const heading = (key: SupporterSort, label: string) => (
    <SortHeading
      key={key}
      sortKey={key}
      current={sort}
      href={sortHref(PATH, supporterFiltersOf(search), SUPPORTER_SORTS, sort, key)}
    >
      {label}
    </SortHeading>
  );
  const columns: (ListColumn<SupporterRow> | false)[] = [
    {
      key: "name",
      label: copy.columns.name,
      heading: heading("name", copy.columns.name),
      text: (s) => s.name,
      cell: (s) => <Link href={`${PATH}/${s.id}`}>{s.name ?? copy.noName}</Link>,
    },
    states.some((state) => state.channel === "email") && {
      key: "email",
      label: copy.columns.email,
      text: (s) => contactsFound(states, "email", s).join("; "),
      cell: (s) => <Addresses addresses={contactsFound(states, "email", s)} />,
    },
    states.some((state) => state.channel === "phone") && {
      key: "phone",
      label: copy.columns.phone,
      short: true,
      text: (s) => contactsFound(states, "phone", s).join("; "),
      cell: (s) => <Addresses addresses={contactsFound(states, "phone", s)} />,
    },
    {
      key: "place",
      label: copy.columns.place,
      short: true,
      text: (s) => s.place?.name ?? null,
      cell: (s) => s.place && <Place place={s.place} />,
    },
    (Boolean(notNations) || (nations?.length ?? 0) > 1) && {
      key: "nation",
      label: staffCopy.politician.country,
      short: true,
      text: (s) => nationOf(s),
      cell: (s) => nationOf(s),
    },
    {
      key: "badges",
      label: copy.columns.badges,
      text: supporterBadgeWords,
      cell: (s) => (
        <div className={styles.badges}>
          <SupporterBadges supporter={s} />
        </div>
      ),
    },
    {
      key: "subscriptions",
      label: copy.columns.subscriptions,
      text: (s) => subscriptionWords(s.permissions),
      cell: (s) => (
        <div className={styles.badges}>
          <SubscriptionBadges permissions={s.permissions} />
        </div>
      ),
    },
    {
      key: "events",
      label: copy.columns.events,
      heading: heading("events", copy.columns.events),
      short: true,
      text: (s) => s.events,
      cell: (s) => s.events,
    },
    Boolean(events) && {
      key: "registrations",
      label: copy.columns.registrations,
      text: (s) =>
        (s.registrations ?? [])
          .map((r) => (named ? `${r.event}: ${registrationStatus(r.status)}` : registrationStatus(r.status)))
          .join("; "),
      cell: (s) => (
        <ul className={styles.registrations}>
          {(s.registrations ?? []).map((r, i) => (
            <li key={i}>
              {named && <Muted>{r.event}: </Muted>}
              {registrationStatus(r.status)}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "letters",
      label: copy.columns.letters,
      heading: heading("letters", copy.columns.letters),
      short: true,
      text: (s) => s.letters,
      cell: (s) => s.letters,
    },
    wrote && {
      key: "wrote",
      label: copy.columns.wrote,
      short: true,
      text: (s) => s.wroteAt ?? null,
      cell: (s) => s.wroteAt && staffDate(s.wroteAt),
    },
    {
      key: "first",
      label: copy.columns.firstSeen,
      heading: heading("first", copy.columns.firstSeen),
      short: true,
      text: (s) => s.firstSeenAt,
      cell: (s) => s.firstSeenAt && staffDate(s.firstSeenAt),
    },
    {
      key: "active",
      label: copy.columns.lastActive,
      heading: heading("active", copy.columns.lastActive),
      short: true,
      text: (s) => s.lastActiveAt,
      cell: (s) => s.lastActiveAt && staffDate(s.lastActiveAt),
    },
  ];
  return columns.filter((column) => column !== false);
}

/**
 * Supporters as contact cards (lib/vcard.ts), for the list's filters: a
 * supporter's name; the addresses and numbers the Contact filter
 * finds, as the columns, none without it; where they are; and in the note
 * what they are to us, what we'd email them about, when we first and last
 * saw them, and how many events and letters.
 */
export function supporterContact(search: Pick<SupportersSearch, "contact">) {
  const states = contactStates(search);
  return (s: SupporterRow): Contact => contactCard(states, s);
}

/** A supporter's card, with the addresses and numbers the Contact filter finds (`states`), as the columns. */
function contactCard(states: ContactState[], s: SupporterRow): Contact {
  const emails = contactsFound(states, "email", s);
  const note = [
    supporterBadgeWords(s) && `${copy.columns.badges}: ${supporterBadgeWords(s)}`,
    subscriptionWords(s.permissions) && `${copy.columns.subscriptions}: ${subscriptionWords(s.permissions)}`,
    s.firstSeenAt && `${copy.columns.firstSeen}: ${staffDate(s.firstSeenAt)}`,
    s.lastActiveAt && `${copy.columns.lastActive}: ${staffDate(s.lastActiveAt)}`,
    `${copy.columns.events}: ${s.events}`,
    `${copy.columns.letters}: ${s.letters}`,
  ].filter((line): line is string => Boolean(line));
  return {
    name: s.name,
    emails,
    phones: contactsFound(states, "phone", s),
    address: {
      locality: s.place?.name,
      postcode: s.postcode,
      country: s.place?.country && staffCopy.countries[s.place.country],
    },
    note,
    url: `${PATH}/${s.id}`,
  };
}

/** The supporters found, in the list frame: a row each, their downloads and the way through the pages. */
export default function SupportersTable({ page, search }: { page: SupportersPage; search: SupportersSearch }) {
  const filters = supporterFiltersOf(search);
  return (
    <ListFrame
      count={copy.total(page.total)}
      total={page.total}
      page={Number(search.page) || 1}
      pages={page.pages}
      pageSize={SUPPORTERS_PAGE_SIZE}
      href={(n) => filtersPath(PATH, filters, pageParam(n))}
      download={(format) => filtersPath(`${PATH}/download`, filters, { format })}
      formats={["csv", "json", "vcf"]}
      columns={supporterColumns(search)}
      rows={page.supporters}
      rowKey={(s) => s.id}
      empty={copy.none}
    />
  );
}
