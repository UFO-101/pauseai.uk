import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersPage } from "@/lib/server/supporters";
import { campaignBySlug } from "@/lib/email-your-mp";
import { anyAndNone, filtersPath, pageParam, valuesOf, type Params, type SupportersSearch } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import { parseSort, sortHref } from "@/lib/staff-sort";
import {
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

/** A registration's status in words: Luma's, or registered for an approved one. */
const registered = (status: string) => copy.detail.statuses[status] ?? copy.detail.registered;

/**
 * The supporters list's columns: who they are (their name; their newest
 * email, and how many others they have; their newest phone; where they
 * are); what they are to us and what we'd email them about, as lozenges;
 * how many events and letters; and when we first saw them and last saw
 * them do something. The Event filter, finding those at events, adds how
 * each registration for them stands, named when there's more than one
 * event; the Campaign filter, finding those who wrote, when they first
 * wrote in it. A download has the same columns.
 */
export function supporterColumns(search: SupportersSearch): ListColumn<SupporterRow>[] {
  const [events] = anyAndNone(valuesOf(search.event), (values) => values);
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
    {
      key: "email",
      label: copy.columns.email,
      text: (s) => s.email,
      cell: (s) => (
        <>
          {s.email}
          {s.emails.length > 1 && <Muted> {copy.moreEmails(s.emails.length - 1)}</Muted>}
        </>
      ),
    },
    { key: "phone", label: copy.columns.phone, short: true, text: (s) => s.phone, cell: (s) => s.phone },
    {
      key: "place",
      label: copy.columns.place,
      short: true,
      text: (s) => s.place?.name ?? null,
      cell: (s) => s.place && <Place place={s.place} />,
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
          .map((r) => (named ? `${r.event}: ${registered(r.status)}` : registered(r.status)))
          .join("; "),
      cell: (s) => (
        <ul className={styles.registrations}>
          {(s.registrations ?? []).map((r, i) => (
            <li key={i}>
              {named && <Muted>{r.event}: </Muted>}
              {registered(r.status)}
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
 * A supporter as a contact card (lib/vcard.ts): their name, every email,
 * the newest first, their phone, where they are, and in the note what
 * they are to us, what we'd email them about, when we first and last saw
 * them, and how many events and letters.
 */
export function supporterContact(s: SupporterRow): Contact {
  const emails = [s.email, ...s.emails.filter((e) => e !== s.email)].filter((e): e is string => Boolean(e));
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
    phones: s.phone ? [s.phone] : [],
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
