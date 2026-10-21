"use client";

import { useState } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { Field, Hint } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";

type Action = (form: FormData) => void | Promise<void>;

type Props = {
  /** Whose: fixed, in a row of the table, or typed, for someone new. */
  email?: string;
  permissions: Permission[];
  save: Action;
};

/**
 * One account's form: a checkbox per permission and Save, sending
 * "permission:<name>" for each ticked box (lib/staff-forms.ts).
 */
export default function StaffAccountForm({ email, permissions, save }: Props) {
  const [ticked, setTicked] = useState(new Set(permissions));
  const label = email ?? staffCopy.accounts.addTitle;
  return (
    <FilterForm action={save} aria-label={label}>
      {email === undefined ? (
        <Field label={staffCopy.accounts.emailLabel}>
          <TextInput name="email" type="email" required />
        </Field>
      ) : (
        <input type="hidden" name="email" value={email} />
      )}
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
      {email === undefined && <Hint>{staffCopy.accounts.noPermissionHint}</Hint>}
    </FilterForm>
  );
}
