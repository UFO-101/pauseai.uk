"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Controls";
import Table from "@/components/ui/Table";
import Tag from "@/components/ui/Tag";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import AddAccountForm from "./AddAccountForm";
import RemoveAccountForm from "./RemoveAccountForm";
import styles from "./StaffAccountsTable.module.css";

type Action = (form: FormData) => void | Promise<void>;

/** Whether two lists of permissions hold the same ones. */
function same(a: readonly Permission[], b: readonly Permission[]): boolean {
  return a.length === b.length && a.every((permission) => b.includes(permission));
}

/**
 * Every account, a checkbox per permission in its row and, at the right, a
 * button to remove it; under the table, one Save for every row, which
 * sends each account ("account") and, for each ticked box, the account's
 * address as "permission:<name>" (lib/staff-forms.ts). A row ticked
 * differently from what's saved is marked, and until it's saved or undone
 * Save says so, the browser asks before leaving, and adding or removing
 * someone, which would lose it, is off. Then what each permission opens,
 * and the form to add someone.
 */
export default function StaffAccountsTable({
  accounts,
  saveAll,
  add,
  remove,
  notPauseai = false,
}: {
  accounts: StaffAccount[];
  saveAll: Action;
  add: Action;
  remove: Action;
  /** The last address added wasn't at pauseai.uk: the form for someone new says so. */
  notPauseai?: boolean;
}) {
  // What's ticked in each row changed here, by address; a row not in it shows what's saved.
  const [ticked, setTicked] = useState<Record<string, Permission[]>>({});
  const shown = (account: StaffAccount) => ticked[account.email] ?? account.permissions;
  const changed = (account: StaffAccount) => !same(shown(account), account.permissions);
  const unsaved = accounts.some(changed);

  useEffect(() => {
    if (!unsaved) return;
    const ask = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [unsaved]);

  const tick = (account: StaffAccount, permission: Permission, on: boolean) =>
    setTicked((was) => {
      const others = (was[account.email] ?? account.permissions).filter((p) => p !== permission);
      return { ...was, [account.email]: on ? [...others, permission] : others };
    });

  const columns = staffCopy.accounts.columns;
  return (
    <>
      <Table align="middle">
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
            <tr key={account.email} className={changed(account) ? styles.changed : undefined}>
              <td>{account.email}</td>
              <td>
                <div className={styles.boxes} role="group" aria-label={account.email}>
                  {PERMISSIONS.map((permission) => (
                    <Checkbox
                      key={permission}
                      checked={shown(account).includes(permission)}
                      onChange={(on) => tick(account, permission, on)}
                    >
                      {staffCopy.accounts.names[permission]}
                    </Checkbox>
                  ))}
                </div>
              </td>
              <td>{account.addedBy}</td>
              <td>{staffTime(account.addedAt)}</td>
              <td>
                <RemoveAccountForm email={account.email} remove={remove} disabled={unsaved} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <form action={saveAll} aria-label={columns.permissions} className={styles.save}>
        {accounts.map((account) => (
          <span key={account.email}>
            <input type="hidden" name="account" value={account.email} />
            {shown(account).map((permission) => (
              <input key={permission} type="hidden" name={`permission:${permission}`} value={account.email} />
            ))}
          </span>
        ))}
        <SubmitButton variant="primary" size="small" disabled={!unsaved}>
          {staffCopy.accounts.save}
        </SubmitButton>
        {unsaved && (
          <>
            <Button type="button" variant="ghost" size="small" onClick={() => setTicked({})}>
              {staffCopy.accounts.undo}
            </Button>
            <span role="status">{staffCopy.accounts.unsaved}</span>
          </>
        )}
      </form>
      <dl className={styles.permissions}>
        {PERMISSIONS.map((permission) => (
          <div key={permission}>
            <dt>
              <Tag>{staffCopy.accounts.names[permission]}</Tag>
            </dt>
            <dd>{staffCopy.accounts.opens[permission]}</dd>
          </div>
        ))}
      </dl>
      <h2>{staffCopy.accounts.addTitle}</h2>
      <AddAccountForm save={add} notPauseai={notPauseai} waiting={unsaved} />
    </>
  );
}
