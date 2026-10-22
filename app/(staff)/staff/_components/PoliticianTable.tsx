import Link from "next/link";
import { SOBEL_BILL_CAMPAIGN } from "@/lib/controlai-letter";
import { campaignBySlug, trackedCampaigns } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_SORTS, type PoliticianSort } from "@/lib/politician-sort";
import type { Politician } from "@/lib/server/politicians";
import { parseSort, sortHref } from "@/lib/staff-sort";
import SortHeading from "./SortHeading";
import styles from "./PoliticianTable.module.css";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import Table from "@/components/ui/Table";

const bill = campaignBySlug(SOBEL_BILL_CAMPAIGN)!;

type Props = {
  politicians: Politician[];
  /** The list's filters and sort as typed, for the headings' links. */
  search?: Record<string, string>;
};

/**
 * Politicians, how many letters they've had and answered, and their status
 * for each campaign. Statuses are changed on each politician's page; the
 * bill's column shows who signed ControlAI's letter, set by the nightly
 * import.
 */
export default function PoliticianTable({ politicians, search = {} }: Props) {
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
  return (
    <Table>
      <thead>
        <tr>
          {heading("name", staffCopy.fields.name)}
          {heading("house", staffCopy.fields.house)}
          {heading("constituency", staffCopy.fields.constituency)}
          {heading("party", staffCopy.fields.party)}
          {heading("letters", staffCopy.politicians.columns.letters)}
          {heading("replies", staffCopy.politicians.columns.replies)}
          {trackedCampaigns.map((c) => (
            <th key={c.slug}>{c.title}</th>
          ))}
          <th>{bill.title}</th>
        </tr>
      </thead>
      <tbody>
        {politicians.map((p) => (
          <tr key={p.id}>
            <td>
              <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
              {p.isTest && <Tag>{staffCopy.politicians.testMp}</Tag>}
              {!p.sitting && <Tag>{staffCopy.politicians.notSitting}</Tag>}
              {p.emailBlocked && <Tag tone="amber">{staffCopy.politicians.emailBlocked}</Tag>}
            </td>
            <td>{staffCopy.houses[p.house]}</td>
            <td>{p.constituency}</td>
            <td>{p.party}</td>
            <td className={styles.count}>{p.letters}</td>
            <td className={styles.count}>{p.replies}</td>
            {trackedCampaigns.map((c) => {
              const status = p.statuses[c.slug];
              return (
                <td key={c.slug} className={styles.signed}>
                  {status ? (
                    <>
                      {staffCopy.statuses[status.status]}
                      {status.date && <Muted> {status.date}</Muted>}
                    </>
                  ) : (
                    <Muted>{staffCopy.statuses.none}</Muted>
                  )}
                </td>
              );
            })}
            <td>
              {p.statuses[SOBEL_BILL_CAMPAIGN] ? (
                staffCopy.politicians.signedControlAi
              ) : (
                <Muted>{staffCopy.statuses.none}</Muted>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
