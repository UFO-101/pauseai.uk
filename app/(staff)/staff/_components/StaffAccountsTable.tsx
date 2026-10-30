"use client";

import { type FormEvent, useOptimistic, useState, useTransition } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { FieldError } from "@/components/ui/Field";
import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import { ADDED_BY_LOGIN, isStaffEmail, PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
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

/**
 * The button that ends every session an account has, beside how many it
 * has open, for a row with any; on your own row, saying they're yours.
 */
function EndSessionsForm({ account, yours, end }: { account: StaffAccount; yours: boolean; end: Action }) {
  const copy = staffCopy.accounts;
  if (account.sessions === 0) return null;
  return (
    <form action={end} aria-label={`${copy.endSessions}: ${account.email}`}>
      <input type="hidden" name="email" value={account.email} />
      <SubmitButton variant="ghost" size="small" fit>
        {yours ? copy.endMySessions : copy.endSessions}
      </SubmitButton>
    </form>
  );
}

/** When, or never. */
const when = (at: string | null) => (at ? staffTime(at) : staffCopy.accounts.never);

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
  const address = (form: FormData) => String(form.get("email")).trim().toLowerCase();
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
      <td colSpan={7}>
        <form action={submit} onSubmit={check} aria-label={copy.addTitle} className={styles.add}>
          <TextInput
            name="email"
            type="email"
            required
            aria-label={copy.addTitle}
            placeholder={copy.addTitle}
            aria-invalid={problem !== undefined}
          />
          <SubmitButton variant="ghost" size="small" fit>
            {copy.add}
          </SubmitButton>
          {problem && (
            <FieldError announce="alert">{problem === "exists" ? copy.alreadyThere : copy.notPauseai}</FieldError>
          )}
        </form>
      </td>
    </tr>
  );
}

/**
 * Every account: a checkbox per permission in its row, each tick saved at
 * once; when and by whom it was added; when it last logged in and was
 * seen; its sessions open; and at the right, a button to end those
 * sessions and one to remove it. Under the last row, a field to add
 * someone. Then, under its own heading, what each permission opens.
 */
export default function StaffAccountsTable({
  accounts,
  you,
  save,
  remove,
  endSessions,
}: {
  accounts: StaffAccount[];
  /** The admin looking, whose own row warns that ending its sessions ends theirs. */
  you: string;
  /** Gives an address an account with exactly the permissions in the form, adding it if it has none. */
  save: Action;
  remove: Action;
  endSessions: Action;
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
            <th>{columns.added}</th>
            <th>{columns.lastLogin}</th>
            <th>{columns.lastSeen}</th>
            <th>{columns.sessions}</th>
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
              <td>
                {staffTime(account.addedAt)}{" "}
                <Muted>{account.addedBy === ADDED_BY_LOGIN ? copy.addedByLogin : copy.addedBy(account.addedBy)}</Muted>
              </td>
              <td>{when(account.lastLoginAt)}</td>
              <td>{when(account.lastSeenAt)}</td>
              <td>
                <span className={styles.sessions}>
                  {account.sessions}
                  <EndSessionsForm account={account} yours={account.email === you} end={endSessions} />
                </span>
              </td>
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
