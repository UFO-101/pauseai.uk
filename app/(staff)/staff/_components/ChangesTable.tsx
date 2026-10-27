import { staffCopy } from "@/lib/content/staff-interface";
import { staffClock, staffDate } from "@/lib/staff-time";
import type { LoggedChange } from "@/lib/server/audit";
import IconButton from "@/components/ui/IconButton";
import Table from "@/components/ui/Table";
import AuditDetail from "./AuditDetail";
import styles from "./ChangesTable.module.css";

/**
 * The log of who changed what, a table for each day under a heading: the
 * time; who; what; the details, in words; and at the right, a button that
 * opens the details as logged. `airtableTable` is the table an Airtable ID
 * in the details is a record of.
 */
export default function ChangesTable({ changes, airtableTable }: { changes: LoggedChange[]; airtableTable: string }) {
  const days = new Map<string, LoggedChange[]>();
  for (const change of changes) {
    const day = staffDate(change.at);
    days.set(day, [...(days.get(day) ?? []), change]);
  }
  return [...days].map(([day, changes]) => (
    <section key={day}>
      <h2>{day}</h2>
      <DayTable changes={changes} airtableTable={airtableTable} />
    </section>
  ));
}

function DayTable({ changes, airtableTable }: { changes: LoggedChange[]; airtableTable: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>{staffCopy.changes.at}</th>
          <th>{staffCopy.changes.actor}</th>
          <th>{staffCopy.changes.action}</th>
          <th>{staffCopy.changes.details}</th>
          <th>
            <span className={styles.hidden}>{staffCopy.changes.json}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.id}>
            <td>{staffClock(change.at)}</td>
            <td>{change.actor}</td>
            <td>{change.action}</td>
            <td>
              <AuditDetail change={change} airtableTable={airtableTable} />
            </td>
            <td>
              <IconButton
                look="outline"
                size={28}
                aria-label={staffCopy.changes.json}
                popoverTarget={`json-${change.id}`}
              >
                {"{}"}
              </IconButton>
              <pre id={`json-${change.id}`} popover="auto" className={styles.json}>
                {JSON.stringify(change.details, null, 2)}
              </pre>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
