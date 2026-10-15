import Link from "next/link";
import { trackedCampaigns } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Politician } from "@/lib/server/politicians";
import styles from "./staff.module.css";

/** Politicians and their status for each campaign. */
export default function PoliticianTable({ politicians }: { politicians: Politician[] }) {
  if (politicians.length === 0) return <p>{staffCopy.politicians.none}</p>;
  return (
    <div className={styles.scroll}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{staffCopy.fields.name}</th>
          <th>{staffCopy.fields.house}</th>
          <th>{staffCopy.fields.constituency}</th>
          <th>{staffCopy.fields.party}</th>
          {trackedCampaigns.map((c) => (
            <th key={c.slug}>{c.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {politicians.map((p) => (
          <tr key={p.id}>
            <td>
              <Link href={`/staff/politicians/${p.id}`}>{p.name}</Link>{" "}
              {p.isTest && <span className={styles.tag}>{staffCopy.politicians.testMp}</span>}
              {!p.sitting && <span className={styles.tag}>{staffCopy.politicians.notSitting}</span>}
            </td>
            <td>{staffCopy.houses[p.house]}</td>
            <td>{p.constituency}</td>
            <td>{p.party}</td>
            {trackedCampaigns.map((c) => {
              const status = p.statuses[c.slug];
              return <td key={c.slug}>{status ? staffCopy.statuses[status.status] : <span className={styles.muted}>{staffCopy.statuses.none}</span>}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
