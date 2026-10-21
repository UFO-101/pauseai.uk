import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { StaffPermissions } from "@/lib/server/staff-permissions";
import { staffTime } from "@/lib/staff-time";
import PermissionsForm from "./PermissionsForm";

type Action = (form: FormData) => void | Promise<void>;

/**
 * Everyone with a permission, each row a form to change theirs, with the
 * built-in admin's fixed; and under them a form to give someone new theirs.
 */
export default function PermissionsTable({ staff, action }: { staff: StaffPermissions[]; action: Action }) {
  const columns = staffCopy.permissions.columns;
  return (
    <>
      <Table>
        <thead>
          <tr>
            <th>{columns.email}</th>
            <th>{columns.permissions}</th>
            <th>{columns.grantedBy}</th>
            <th>{columns.grantedAt}</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.email}>
              <td>{member.email}</td>
              <td>
                {member.grantedBy === null ? (
                  <Muted>{staffCopy.permissions.builtIn}</Muted>
                ) : (
                  <PermissionsForm email={member.email} permissions={member.permissions} action={action} />
                )}
              </td>
              <td>{member.grantedBy}</td>
              <td>{member.grantedAt && staffTime(member.grantedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <h2>{staffCopy.permissions.addTitle}</h2>
      <PermissionsForm permissions={[]} action={action} />
    </>
  );
}
