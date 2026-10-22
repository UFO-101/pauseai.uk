"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { FieldError } from "@/components/ui/Field";
import Table from "@/components/ui/Table";
import Tag from "@/components/ui/Tag";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { isStaffEmail, PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import type { StaffAccount } from "@/lib/server/staff-accounts";
import { staffTime } from "@/lib/staff-time";
import RemoveAccountForm from "./RemoveAccountForm";
import styles from "./StaffAccountsTable.module.css";

type Action = (form: FormData) => void | Promise<void>;

/** Whether two lists of permissions hold the same ones. */
function same(a: readonly Permission[], b: readonly Permission[]): boolean {
  return a.length === b.length && a.every((permission) => b.includes(permission));
}

/** A row: an account saved, or someone added here and not saved yet (`added`). */
type Row = StaffAccount & { added?: boolean };

/** Why an address typed to add can't be: not at pauseai.uk, or already in the table. */
type AddProblem = "not-pauseai" | "exists";

/**
 * Every account, a checkbox per permission in its row and, at the right, a
 * button to remove it; under the last row, a field to add someone. One
 * Save, under the table, sends every row ("account") and, for each ticked
 * box, the row's address as "permission:<name>" (lib/staff-forms.ts), so
 * someone added is a row like the others, given an account when it's
 * saved. A row added, or ticked differently from what's saved, is marked,
 * and until it's saved or undone Save says so, the browser asks before
 * leaving, and removing an account, which would lose it, is off. Then what
 * each permission opens.
 */
export default function StaffAccountsTable({
  accounts,
  saveAll,
  remove,
}: {
  accounts: StaffAccount[];
  saveAll: Action;
  remove: Action;
}) {
  // What's ticked in each row changed here, by address; a row not in it shows what's saved.
  const [ticked, setTicked] = useState<Record<string, Permission[]>>({});
  // Addresses added here, not saved yet, in the order they were added.
  const [added, setAdded] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<AddProblem>();
  const rows: Row[] = [
    ...accounts,
    ...added.map((email) => ({ email, permissions: [], addedBy: "", addedAt: "", added: true })),
  ];
  const shown = (row: Row) => ticked[row.email] ?? row.permissions;
  const changed = (row: Row) => row.added === true || !same(shown(row), row.permissions);
  const unsaved = rows.some(changed);

  useEffect(() => {
    if (!unsaved) return;
    const ask = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [unsaved]);

  const tick = (row: Row, permission: Permission, on: boolean) =>
    setTicked((was) => {
      const others = (was[row.email] ?? row.permissions).filter((p) => p !== permission);
      return { ...was, [row.email]: on ? [...others, permission] : others };
    });

  const add = () => {
    const email = typed.trim().toLowerCase();
    if (!email) return;
    if (!isStaffEmail(email)) return setProblem("not-pauseai");
    if (rows.some((row) => row.email === email)) return setProblem("exists");
    setAdded((was) => [...was, email]);
    setTyped("");
    setProblem(undefined);
  };

  const drop = (email: string) => {
    setAdded((was) => was.filter((other) => other !== email));
    setTicked((was) => Object.fromEntries(Object.entries(was).filter(([other]) => other !== email)));
  };

  const undo = () => {
    setTicked({});
    setAdded([]);
  };

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
          {rows.map((row) => (
            <tr key={row.email} className={changed(row) ? styles.changed : undefined}>
              <td>{row.email}</td>
              <td>
                <div className={styles.boxes} role="group" aria-label={row.email}>
                  {PERMISSIONS.map((permission) => (
                    <Checkbox
                      key={permission}
                      checked={shown(row).includes(permission)}
                      onChange={(on) => tick(row, permission, on)}
                    >
                      {copy.names[permission]}
                    </Checkbox>
                  ))}
                </div>
              </td>
              <td>{row.addedBy}</td>
              <td>{row.addedAt && staffTime(row.addedAt)}</td>
              <td>
                {row.added ? (
                  <Button type="button" variant="ghost" size="small" onClick={() => drop(row.email)}>
                    {copy.remove}
                  </Button>
                ) : (
                  <RemoveAccountForm email={row.email} remove={remove} disabled={unsaved} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>
              <div className={styles.add}>
                <TextInput
                  type="email"
                  aria-label={copy.addTitle}
                  aria-invalid={problem !== undefined}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    add();
                  }}
                />
                <Button type="button" variant="ghost" size="small" onClick={add}>
                  {copy.add}
                </Button>
                {problem && (
                  <FieldError announce="alert">{problem === "exists" ? copy.alreadyThere : copy.notPauseai}</FieldError>
                )}
              </div>
            </td>
          </tr>
        </tfoot>
      </Table>
      <form action={saveAll} aria-label={columns.permissions} className={styles.save}>
        {rows.flatMap((row) => [
          <input key={row.email} type="hidden" name="account" value={row.email} />,
          ...shown(row).map((permission) => (
            <input
              key={`${row.email} ${permission}`}
              type="hidden"
              name={`permission:${permission}`}
              value={row.email}
            />
          )),
        ])}
        <SubmitButton variant="primary" size="small" disabled={!unsaved}>
          {copy.save}
        </SubmitButton>
        {unsaved && (
          <>
            <Button type="button" variant="ghost" size="small" onClick={undo}>
              {copy.undo}
            </Button>
            <span role="status">{copy.unsaved}</span>
          </>
        )}
      </form>
      <dl className={styles.permissions}>
        {PERMISSIONS.map((permission) => (
          <div key={permission}>
            <dt>
              <Tag>{copy.names[permission]}</Tag>
            </dt>
            <dd>{copy.opens[permission]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
