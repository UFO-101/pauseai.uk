import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_SORTS, type PoliticianSort } from "@/lib/politician-sort";
import type { Ask } from "@/lib/server/asks";
import type { Politician } from "@/lib/server/politicians";
import { parseSort, sortHref } from "@/lib/staff-sort";
import SortHeading from "./SortHeading";
import styles from "./PoliticianTable.module.css";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import Table from "@/components/ui/Table";

type Props = {
  politicians: Politician[];
  /** Every ask, for their titles, in the order the asks page lists them. */
  asks: Ask[];
  /** The list's filters and sort as typed, for the headings' links. */
  search?: Record<string, string>;
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

const marks = (p: Politician) =>
  [p.importantTarget && "important", p.personalConnection && "connection", p.airtableRemovedAt && "removed"]
    .filter(Boolean)
    .join();

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
 * Politicians: their house, constituency and party, whether they're in
 * office, Airtable's markers, how many letters they've had and answered,
 * and their answer to each ask they've answered, a line each. A column that
 * would say the same for every row is left out, as is one the filters fix:
 * a house, a party, or one status, those in office unless another or any
 * is chosen. Statuses are changed on each politician's page.
 */
export default function PoliticianTable({ politicians, asks, search = {} }: Props) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
  const show = {
    house: !(search.house in staffCopy.houses) && shows(politicians, (p) => p.house),
    constituency: shows(politicians, (p) => p.constituency ?? ""),
    party: !search.party && shows(politicians, (p) => p.party),
    status: (search.status ?? "any") === "any" && shows(politicians, (p) => p.status),
    marked: shows(politicians, marks),
  };
  const { sort, dir, ...filters } = search;
  const current = parseSort(POLITICIAN_SORTS, "name", sort, dir);
  const heading = (key: PoliticianSort, label: string) => (
    <SortHeading
      sortKey={key}
      current={current}
      href={sortHref("/staff/politicians", filters, POLITICIAN_SORTS, current, key)}
    >
      {label}
    </SortHeading>
  );
  return (
    <Table>
      <thead>
        <tr>
          {heading("name", staffCopy.fields.name)}
          {show.house && heading("house", staffCopy.fields.house)}
          {show.constituency && heading("constituency", staffCopy.fields.constituency)}
          {show.party && heading("party", staffCopy.fields.party)}
          {show.status && <th>{staffCopy.politicians.columns.status}</th>}
          {show.marked && <th>{staffCopy.politicians.flag}</th>}
          {heading("letters", staffCopy.politicians.columns.letters)}
          {heading("replies", staffCopy.politicians.columns.replies)}
          {heading("asks", staffCopy.politicians.columns.asks)}
        </tr>
      </thead>
      <tbody>
        {politicians.map((p) => {
          const answered = asks.filter((ask) => p.statuses[ask.slug]);
          return (
            <tr key={p.id}>
              <td>
                <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
                {p.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
                {p.emailBlocked && <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>}
              </td>
              {show.house && <td>{staffCopy.houses[p.house]}</td>}
              {show.constituency && <td>{p.constituency}</td>}
              {show.party && <td>{p.party}</td>}
              {show.status && (
                <td className={styles.status}>
                  {p.status === "in_office" ? (
                    staffCopy.personStatuses[p.status]
                  ) : (
                    <Muted>{staffCopy.personStatuses[p.status]}</Muted>
                  )}
                </td>
              )}
              {show.marked && (
                <td>
                  <span className={styles.marks}>
                    <Marks politician={p} />
                  </span>
                </td>
              )}
              <td className={styles.count}>{p.letters}</td>
              <td className={styles.count}>{p.replies}</td>
              <td>
                {answered.length ? (
                  <ul className={styles.asks}>
                    {answered.map((ask) => (
                      <li key={ask.slug}>
                        <strong>{staffCopy.statuses[p.statuses[ask.slug].status]}</strong>{" "}
                        <span className={styles.ask}>{ask.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Muted>{staffCopy.politicians.noAsks}</Muted>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
