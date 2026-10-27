import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_SORTS, type PoliticianSort } from "@/lib/politician-sort";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import { anyAndNone, firstOf, valuesOf, type Params } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import { parseSort, sortHref } from "@/lib/staff-sort";
import SortHeading from "./SortHeading";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import type { Contact } from "@/lib/vcard";
import styles from "./PoliticianTable.module.css";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";

type Props = {
  politicians: Politician[];
  /** Every ask, for their titles, in the order the asks page lists them. */
  asks: Ask[];
  /** The list's filters and sort as typed, for the headings' links. */
  search?: Params;
};

/** Airtable's markers on them, and whether their record has gone from it, as lozenges. */
function Marks({ politician }: { politician: Politician }) {
  const { flags } = staffCopy.politicians;
  return (
    <>
      {politician.importantTarget && <Tag tone="amber">{flags.important}</Tag>}
      {politician.personalConnection && <Tag>{flags.connection}</Tag>}
      {politician.airtableRemovedAt && <Tag tone="amber">{flags.removed}</Tag>}
    </>
  );
}

/** Airtable's markers on them, in words, as a download has them. */
const marks = (p: Politician) => {
  const { flags } = staffCopy.politicians;
  return [
    p.importantTarget && flags.important,
    p.personalConnection && flags.connection,
    p.airtableRemovedAt && flags.removed,
  ]
    .filter(Boolean)
    .join("; ");
};

/**
 * The politicians list's columns: who they are (name, house, constituency
 * and party), how they stand (whether they're in office, Airtable's
 * markers, their answer to each ask they've answered, a line each), how
 * many letters they've had and answered, and when they first and last did
 * anything with us. Which show is the filters' doing, not the rows': a
 * column is left out only when the filters fix it for every row there
 * could be. That's a house (and for peers, the constituency they don't
 * have), one party found (one left out doesn't fix it), or one status,
 * those in office unless another or any is chosen. A download has the same
 * columns.
 */
export function politicianColumns(asks: Ask[], search: Params = {}): ListColumn<Politician>[] {
  const house = firstOf(search.house);
  const [parties] = anyAndNone(valuesOf(search.party), (values) => values);
  const show = {
    house: !Object.hasOwn(staffCopy.houses, house),
    constituency: house !== "lords",
    party: parties?.length !== 1,
    status: firstOf(search.status ?? "any") === "any",
  };
  const { sort, dir, ...filters } = search;
  const current = parseSort(POLITICIAN_SORTS, "name", firstOf(sort), firstOf(dir));
  const heading = (key: PoliticianSort, label: string) => (
    <SortHeading
      key={key}
      sortKey={key}
      current={current}
      href={sortHref("/staff/politicians", filters, POLITICIAN_SORTS, current, key)}
    >
      {label}
    </SortHeading>
  );
  const answered = (p: Politician) => asks.filter((ask) => p.statuses[ask.slug]);
  const columns: (ListColumn<Politician> | false)[] = [
    {
      key: "name",
      label: staffCopy.fields.name,
      heading: heading("name", staffCopy.fields.name),
      text: (p) => p.name,
      cell: (p) => (
        <>
          <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
          {p.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
          {p.emailBlocked && <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>}
        </>
      ),
    },
    show.house && {
      key: "house",
      label: staffCopy.fields.house,
      heading: heading("house", staffCopy.fields.house),
      short: true,
      text: (p) => staffCopy.houses[p.house],
      cell: (p) => staffCopy.houses[p.house],
    },
    show.constituency && {
      key: "constituency",
      label: staffCopy.fields.constituency,
      heading: heading("constituency", staffCopy.fields.constituency),
      text: (p) => p.constituency,
      cell: (p) => p.constituency,
    },
    show.party && {
      key: "party",
      label: staffCopy.fields.party,
      heading: heading("party", staffCopy.fields.party),
      short: true,
      text: (p) => p.party,
      cell: (p) => p.party,
    },
    show.status && {
      key: "status",
      label: staffCopy.politicians.columns.status,
      short: true,
      text: (p) => staffCopy.personStatuses[p.status],
      cell: (p) =>
        p.status === "in_office" ? (
          staffCopy.personStatuses[p.status]
        ) : (
          <Muted>{staffCopy.personStatuses[p.status]}</Muted>
        ),
    },
    {
      key: "marked",
      label: staffCopy.politicians.flag,
      text: marks,
      cell: (p) => (
        <span className={styles.marks}>
          <Marks politician={p} />
        </span>
      ),
    },
    {
      key: "asks",
      label: staffCopy.politicians.columns.asks,
      heading: heading("asks", staffCopy.politicians.columns.asks),
      text: (p) =>
        answered(p)
          .map((ask) => `${staffCopy.statuses[p.statuses[ask.slug].status]}: ${ask.title}`)
          .join("; "),
      cell: (p) =>
        answered(p).length ? (
          <ul className={styles.asks}>
            {answered(p).map((ask) => (
              <li key={ask.slug}>
                <strong>{staffCopy.statuses[p.statuses[ask.slug].status]}</strong>{" "}
                <span className={styles.ask}>{ask.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{staffCopy.politicians.noAsks}</Muted>
        ),
    },
    {
      key: "letters",
      label: staffCopy.politicians.columns.letters,
      heading: heading("letters", staffCopy.politicians.columns.letters),
      short: true,
      className: styles.count,
      text: (p) => p.letters,
      cell: (p) => p.letters,
    },
    {
      key: "replies",
      label: staffCopy.politicians.columns.replies,
      heading: heading("replies", staffCopy.politicians.columns.replies),
      short: true,
      className: styles.count,
      text: (p) => p.replies,
      cell: (p) => p.replies,
    },
    {
      key: "first",
      label: staffCopy.politicians.columns.first,
      heading: heading("first", staffCopy.politicians.columns.first),
      short: true,
      text: (p) => p.firstActivityAt,
      cell: (p) => p.firstActivityAt && staffDate(p.firstActivityAt),
    },
    {
      key: "active",
      label: staffCopy.politicians.columns.last,
      heading: heading("active", staffCopy.politicians.columns.last),
      short: true,
      text: (p) => p.lastActivityAt,
      cell: (p) => p.lastActivityAt && staffDate(p.lastActivityAt),
    },
  ];
  return columns.filter((column) => column !== false);
}

/**
 * A politician as a contact card (lib/vcard.ts): their name and email,
 * their house and party, their constituency and nation, and in the note
 * whether they're in office, Airtable's markers, their letters and replies,
 * and their answer to each ask.
 */
export function politicianContact(asks: Ask[]): (p: Politician) => Contact {
  return (p) => ({
    name: p.name,
    emails: p.email ? [p.email] : [],
    phones: [],
    org: staffCopy.houses[p.house],
    title: p.party || null,
    address: { locality: p.constituency, country: p.country && staffCopy.countries[p.country] },
    note: [
      staffCopy.personStatuses[p.status],
      marks(p),
      `${staffCopy.politicians.columns.letters}: ${p.letters}`,
      `${staffCopy.politicians.columns.replies}: ${p.replies}`,
      ...asks
        .filter((ask) => p.statuses[ask.slug])
        .map((ask) => `${staffCopy.statuses[p.statuses[ask.slug].status]}: ${ask.title}`),
    ].filter(Boolean),
    url: `/staff/politicians/${p.id}`,
  });
}

/** Politicians, a row each, in the list's columns; or that there are none. */
export default function PoliticianTable({ politicians, asks, search = {} }: Props) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
  return <ListTable columns={politicianColumns(asks, search)} rows={politicians} rowKey={(p) => p.id} />;
}
