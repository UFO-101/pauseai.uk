import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_SORTS, type PoliticianSort } from "@/lib/politician-sort";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import { firstOf, valuesOf, type Params } from "@/lib/staff-search";
import { parseSort, sortHref } from "@/lib/staff-sort";
import SortHeading from "./SortHeading";
import { ListTable, type ListColumn } from "./ui/ListFrame";
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
 * Whether a column tells the rows apart: not when every row has the same
 * value, as when the list is filtered by it, nor when it's blank in all of
 * them. A row on its own shows whatever it has.
 */
function shows(politicians: Politician[], value: (p: Politician) => string): boolean {
  const values = new Set(politicians.map(value));
  return values.size > 1 || (politicians.length === 1 && !values.has(""));
}

/**
 * The politicians list's columns: their name, house, constituency and party,
 * whether they're in office, Airtable's markers, how many letters they've
 * had and answered, and their answer to each ask they've answered, a line
 * each. A column that would say the same for every row is left out, as is
 * one the filters fix: a house, a party, or one status, those in office
 * unless another or any is chosen. A download has the same columns, from
 * every row it has.
 */
export function politicianColumns(
  politicians: Politician[],
  asks: Ask[],
  search: Params = {},
): ListColumn<Politician>[] {
  const show = {
    house: !Object.hasOwn(staffCopy.houses, firstOf(search.house)) && shows(politicians, (p) => p.house),
    constituency: shows(politicians, (p) => p.constituency ?? ""),
    party: valuesOf(search.party).length !== 1 && shows(politicians, (p) => p.party),
    status: firstOf(search.status ?? "any") === "any" && shows(politicians, (p) => p.status),
    marked: shows(politicians, marks),
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
    show.marked && {
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
  ];
  return columns.filter((column) => column !== false);
}

/** Politicians, a row each, in the list's columns; or that there are none. */
export default function PoliticianTable({ politicians, asks, search = {} }: Props) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
  return <ListTable columns={politicianColumns(politicians, asks, search)} rows={politicians} rowKey={(p) => p.id} />;
}
