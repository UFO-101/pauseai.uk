"use client";

import { useState } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";

type Props = {
  /** Whose: fixed, in a row of the table, or typed, for someone new. */
  email?: string;
  permissions: Permission[];
  action: (form: FormData) => void | Promise<void>;
};

/**
 * A checkbox per permission and a save button, for one staff member: the
 * form sends "permission:<name>" for each ticked box (lib/staff-forms.ts).
 */
export default function PermissionsForm({ email, permissions, action }: Props) {
  const [ticked, setTicked] = useState(new Set(permissions));
  const label = email ?? staffCopy.permissions.addTitle;
  return (
    <FilterForm action={action} aria-label={label}>
      {email === undefined ? (
        <Field label={staffCopy.permissions.emailLabel}>
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
          {staffCopy.permissions.names[permission]}
        </Checkbox>
      ))}
      <SubmitButton variant="primary" size="small">
        {staffCopy.permissions.save}
      </SubmitButton>
    </FilterForm>
  );
}
