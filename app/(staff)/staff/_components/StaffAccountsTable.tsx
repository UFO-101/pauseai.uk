"use client";

import { type FormEvent, useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { FieldError } from "@/components/ui/Field";
import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import { isStaffEmail, PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import RemoveAccountForm from "./RemoveAccountForm";
import styles from "./StaffAccountsTable.module.css";

type Action = (form: FormData) => void | Promise<void>;

/** The form an account's permissions are saved with: whose, and "permission:<name>" for each ticked (lib/staff-forms.ts). */
function accountForm(email: string, permissions: readonly Permission[]): FormData {
  const form = new FormData();
  form.set("email", email);
  for (const permission of permissions) form.set(`permission:${permission}`, "on");
  return form;
}

/**
 * An account's checkboxes, a box per permission. A tick is saved at once:
 * the boxes show it straight away, and are off until it's saved. One
 * refused (the last admin) goes back to what's saved, and the page says why.
 */
function PermissionBoxes({ account, save }: { account: StaffAccount; save: Action }) {
  const [saving, startSaving] = useTransition();
  const [shown, show] = useOptimistic(account.permissions);
  const tick = (permission: Permission, on: boolean) => {
    const next = PERMISSIONS.filter((p) => (p === permission ? on : shown.includes(p)));
    startSaving(async () => {
      show(next);
      await save(accountForm(account.email, next));
    });
  };
  return (
    <div className={styles.boxes} role="group" aria-label={account.email} aria-busy={saving}>
      {PERMISSIONS.map((permission) => (
        <Checkbox
          key={permission}
          checked={shown.includes(permission)}
          disabled={saving}
          onChange={(on) => tick(permission, on)}
        >
          {staffCopy.accounts.names[permission]}
        </Checkbox>
      ))}
    </div>
  );
}

/** Why an address typed to add can't be: not at pauseai.uk, or already in the table. */
type AddProblem = "not-pauseai" | "exists";

/**
 * Under the last row: the address of someone to add, and Add, which gives
 * them an account at once, with no permissions; their row then sets more.
 * An address not at pauseai.uk, or in the table already, is refused here.
 */
function AddRow({ accounts, add }: { accounts: StaffAccount[]; add: Action }) {
  const [problem, setProblem] = useState<AddProblem>();
  const copy = staffCopy.accounts;
  const address = (form: FormData) =>
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
  // Checked before the form is sent, so a refused address stays in the field to be put right.
  const check = (event: FormEvent<HTMLFormElement>) => {
    const email = address(new FormData(event.currentTarget));
    const found = !isStaffEmail(email) ? "not-pauseai" : accounts.some((a) => a.email === email) ? "exists" : undefined;
    setProblem(found);
    if (found) event.preventDefault();
  };
  const submit = (form: FormData) => add(accountForm(address(form), []));
  return (
    <tr>
      <td colSpan={5}>
        <form action={submit} onSubmit={check} aria-label={copy.addTitle} className={styles.add}>
          <TextInput
            name="email"
            type="email"
            required
            aria-label={copy.addTitle}
            aria-invalid={problem !== undefined}
          />
          <Button type="submit" variant="ghost" size="small">
            {copy.add}
          </Button>
          {problem && (
            <FieldError announce="alert">{problem === "exists" ? copy.alreadyThere : copy.notPauseai}</FieldError>
          )}
        </form>
      </td>
    </tr>
  );
}

/**
 * Every account, a checkbox per permission in its row, each tick saved at
 * once, and at the right a button to remove it; under the last row, a
 * field to add someone. Then, under its own heading, what each permission
 * opens.
 */
export default function StaffAccountsTable({
  accounts,
  save,
  remove,
}: {
  accounts: StaffAccount[];
  /** Gives an address an account with exactly the permissions in the form, adding it if it has none. */
  save: Action;
  remove: Action;
}) {
  const copy = staffCopy.accounts;
  const columns = copy.columns;
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
            <tr key={account.email}>
              <td>{account.email}</td>
              <td>
                <PermissionBoxes account={account} save={save} />
              </td>
              <td>{account.addedBy}</td>
              <td>{staffTime(account.addedAt)}</td>
              <td>
                <RemoveAccountForm email={account.email} remove={remove} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <AddRow accounts={accounts} add={save} />
        </tfoot>
      </Table>
      <h2>{copy.permissionsKey}</h2>
      <dl className={styles.permissions}>
        {PERMISSIONS.map((permission) => (
          <div key={permission}>
            <dt>{copy.names[permission]}</dt>
            <dd>{copy.opens[permission]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
