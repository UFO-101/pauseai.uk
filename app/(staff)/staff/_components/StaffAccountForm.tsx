"use client";

import { useState } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";
import styles from "./StaffForms.module.css";

type Action = (form: FormData) => void | Promise<void>;

type Props = {
  /** Whose: fixed, in a row of the table, or typed, for someone new. */
  email?: string;
  permissions: Permission[];
  save: Action;
};

/**
 * One account's form, a row either way. In a row of the table: a checkbox
 * per permission and Save, sending "permission:<name>" for each ticked box
 * (lib/staff-forms.ts). For someone new: their email and Add, with no
 * boxes, so they start with an account alone and get permissions in their
 * row of the table.
 */
export default function StaffAccountForm({ email, permissions, save }: Props) {
  const [ticked, setTicked] = useState(new Set(permissions));
  if (email === undefined) {
    return (
      <FilterForm action={save} aria-label={staffCopy.accounts.addTitle}>
        <Field label={staffCopy.accounts.emailLabel}>
          <TextInput name="email" type="email" required />
        </Field>
        <SubmitButton variant="primary" size="small">
          {staffCopy.accounts.add}
        </SubmitButton>
      </FilterForm>
    );
  }
  return (
    <FilterForm action={save} aria-label={email} className={styles.centred}>
      <input type="hidden" name="email" value={email} />
      {PERMISSIONS.map((permission) => (
        <Checkbox
          key={permission}
          name={`permission:${permission}`}
          checked={ticked.has(permission)}
          onChange={(on) =>
            setTicked((was) => {
              const next = new Set(was);
              if (on) next.add(permission);
              else next.delete(permission);
              return next;
            })
          }
        >
          {staffCopy.accounts.names[permission]}
        </Checkbox>
      ))}
      <SubmitButton variant="primary" size="small">
        {staffCopy.accounts.save}
      </SubmitButton>
    </FilterForm>
  );
}
