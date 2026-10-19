import { staffCopy } from "@/lib/content/staff-interface";
import { staffTime } from "@/lib/staff-time";
import type { AuditEntry } from "@/lib/server/audit";
import Table from "@/components/ui/Table";

/** The log of who changed what. */
export default function ChangesTable({ changes }: { changes: AuditEntry[] }) {
  return (
    <Table>
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
            <td>{staffTime(change.at)}</td>
            <td>{change.actor}</td>
            <td>{change.action}</td>
            <td>
              <code>{JSON.stringify(change.details)}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
