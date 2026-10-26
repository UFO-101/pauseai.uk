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
  /** Every ask, for the titles of the letters they've signed. */
  asks: Ask[];
  /** The list's filters and sort as typed, for the headings' links. */
  search?: Record<string, string>;
};

/**
 * Politicians: whether they're in office, how many letters they've had
 * and answered, and the letters they've signed. Statuses are changed on
 * each politician's page.
 */
export default function PoliticianTable({ politicians, asks, search = {} }: Props) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
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
  const letters = asks.filter((ask) => ask.kind === "letter");
  return (
    <Table>
      <thead>
        <tr>
          {heading("name", staffCopy.fields.name)}
          {heading("house", staffCopy.fields.house)}
          {heading("constituency", staffCopy.fields.constituency)}
          {heading("party", staffCopy.fields.party)}
          <th>{staffCopy.politicians.columns.status}</th>
          {heading("letters", staffCopy.politicians.columns.letters)}
          {heading("replies", staffCopy.politicians.columns.replies)}
          <th>{staffCopy.politicians.columns.signed}</th>
        </tr>
      </thead>
      <tbody>
        {politicians.map((p) => {
          const signed = letters.filter((ask) => p.statuses[ask.slug]?.status === "signed");
          return (
            <tr key={p.id}>
              <td>
                <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
                {p.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
                {p.emailBlocked && <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>}
              </td>
              <td>{staffCopy.houses[p.house]}</td>
              <td>{p.constituency}</td>
              <td>{p.party}</td>
              <td className={styles.status}>
                {p.status === "in_office" ? (
                  staffCopy.personStatuses[p.status]
                ) : (
                  <Muted>{staffCopy.personStatuses[p.status]}</Muted>
                )}
              </td>
              <td className={styles.count}>{p.letters}</td>
              <td className={styles.count}>{p.replies}</td>
              <td>
                {signed.length ? signed.map((ask) => ask.title).join(", ") : <Muted>{staffCopy.statuses.none}</Muted>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
