import { Hint } from "@/components/ui/Field";
import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import { PERMISSIONS } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import RemoveAccountForm from "./RemoveAccountForm";
import StaffAccountForm from "./StaffAccountForm";
import styles from "./StaffAccountsTable.module.css";

type Action = (form: FormData) => void | Promise<void>;

/**
 * Every account, each row a form to change its permissions and, at the
 * right, a button to remove it; what each permission opens; and under
 * them a form to add someone, who then gets permissions in their row.
 */
export default function StaffAccountsTable({
  accounts,
  save,
  remove,
}: {
  accounts: StaffAccount[];
  save: Action;
  remove: Action;
}) {
  const columns = staffCopy.accounts.columns;
  return (
    <>
      <div className={styles.accounts}>
        <Table>
          <thead>
            <tr>
              <th>{columns.email}</th>
              <th>{columns.permissions}</th>
              <th>{columns.addedBy}</th>
              <th>{columns.addedAt}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.email}>
                <td>{account.email}</td>
                <td>
                  <StaffAccountForm email={account.email} permissions={account.permissions} save={save} />
                </td>
                <td>{account.addedBy}</td>
                <td>{staffTime(account.addedAt)}</td>
                <td>
                  <RemoveAccountForm email={account.email} remove={remove} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Hint>
        {PERMISSIONS.map(
          (permission) => `${staffCopy.accounts.names[permission]}: ${staffCopy.accounts.opens[permission]}`,
        ).join(" ")}
      </Hint>
      <h2>{staffCopy.accounts.addTitle}</h2>
      <StaffAccountForm permissions={[]} save={save} />
    </>
  );
}
