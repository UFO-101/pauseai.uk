"use client";

import { type FormEvent, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { FieldError } from "@/components/ui/Field";
import Table from "@/components/ui/Table";
import { staffCopy } from "@/lib/content/staff-interface";
import { ADDED_BY_LOGIN, isStaffEmail, PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { DeleteTwice } from "./DeleteTwice";
import Bubble from "./ui/Bubble";
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
 * An account's permissions, by name, and beside them, Edit, which opens a
 * bubble under it, over the table, so the row doesn't move: a box for
 * each, ticked for those it has; Save, off till they differ from what's
 * saved, saves them and closes it, and Cancel closes it as it was. One refused (the last admin) stays as it was saved,
 * and the page says why.
 */
function Permissions({ account, save }: { account: StaffAccount; save: Action }) {
  const copy = staffCopy.accounts;
  const [ticked, setTicked] = useState<readonly Permission[]>(account.permissions);
  const form = useRef<HTMLFormElement>(null);
  const close = () => form.current!.closest<HTMLElement>("[popover]")!.hidePopover();
  return (
    <span className={styles.permissionsCell}>
      {account.permissions.length ? account.permissions.map((p) => copy.names[p]).join(", ") : <Muted>–</Muted>}
      <Bubble
        id={`permissions-${account.email.replace(/\W/g, "-")}`}
        trigger={buttonClass({ variant: "ghost", size: "small", fit: true })}
        label={copy.edit}
      >
        <form
          ref={form}
          className={styles.editor}
          aria-label={copy.editLabel(account.email)}
          action={async () => {
            await save(accountForm(account.email, ticked));
            close();
          }}
        >
          <div className={styles.boxes}>
            {PERMISSIONS.map((permission) => (
              <Checkbox
                key={permission}
                checked={ticked.includes(permission)}
                onChange={(on) => setTicked(PERMISSIONS.filter((p) => (p === permission ? on : ticked.includes(p))))}
              >
                {copy.names[permission]}
              </Checkbox>
            ))}
          </div>
          <span className={styles.buttons}>
            <SubmitButton
              variant="primary"
              size="small"
              fit
              disabled={PERMISSIONS.every((p) => ticked.includes(p) === account.permissions.includes(p))}
            >
              {copy.save}
            </SubmitButton>
            <Button
              variant="ghost"
              size="small"
              fit
              type="button"
              onClick={() => {
                setTicked(account.permissions);
                close();
              }}
            >
              {copy.cancel}
            </Button>
          </span>
        </form>
      </Bubble>
    </span>
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
 * The page's main button, Add staff, which opens a box with the address of
 * someone to add, and Add, which gives them an account at once, with no
 * permissions; their row then sets more. An address not at pauseai.uk, or
 * in the table already, is refused here.
 */
export function AddStaff({ accounts, add }: { accounts: StaffAccount[]; add: Action }) {
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
    <Bubble id="add-staff" trigger={buttonClass({ variant: "primary", fit: true })} label={copy.addStaff}>
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
    </Bubble>
  );
}

/**
 * Every account: its permissions, and Edit to change them; when and by
 * whom it was added; when it last logged in and was seen; its sessions
 * open; and at the right, a button to end those sessions and one to remove
 * it, pressed twice. Its last row is everyone else at pauseai.uk, who can
 * log in with no permissions, said across the row from Added on. Then, under its own heading, what each
 * permission opens.
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
                <Permissions account={account} save={save} />
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
                <DeleteTwice name="email" value={account.email} label={copy.remove} short action={remove} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{copy.everyone}</td>
            <td>
              <Muted>–</Muted>
            </td>
            <td colSpan={5}>
              <Muted>{copy.everyoneNote}</Muted>
            </td>
          </tr>
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
