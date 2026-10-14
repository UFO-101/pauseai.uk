import { staffCopy } from "@/lib/content/staff-interface";
import type { AuditEntry } from "@/lib/server/audit";
import styles from "./staff.module.css";

/** The log of who changed what. */
export default function ChangesTable({ changes }: { changes: AuditEntry[] }) {
  return (
    <div className={styles.scroll}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{staffCopy.changes.at}</th>
          <th>{staffCopy.changes.actor}</th>
          <th>{staffCopy.changes.action}</th>
          <th>{staffCopy.changes.details}</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.id}>
            <td>{new Date(change.at).toLocaleString("en-GB")}</td>
            <td>{change.actor}</td>
            <td>{change.action}</td>
            <td>
              <code>{JSON.stringify(change.details)}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
