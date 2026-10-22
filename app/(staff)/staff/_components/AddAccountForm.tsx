"use client";

import { TextInput } from "@/components/ui/Controls";
import { Field, FieldError, FieldGroup, Hint } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

type Props = {
  save: (form: FormData) => void | Promise<void>;
  /** The last address tried wasn't at pauseai.uk. */
  notPauseai?: boolean;
  /** The table above has changes not saved yet, which adding someone would lose. */
  waiting?: boolean;
};

/**
 * The form for someone new: their email and Add, with no boxes, so they
 * start with an account alone and get permissions in their row of the
 * table. Off while the table has changes not saved.
 */
export default function AddAccountForm({ save, notPauseai = false, waiting = false }: Props) {
  return (
    <FilterForm action={save} aria-label={staffCopy.accounts.addTitle}>
      <FieldGroup>
        <Field label={staffCopy.accounts.emailLabel}>
          <TextInput name="email" type="email" required disabled={waiting} />
        </Field>
        {notPauseai && <FieldError>{staffCopy.accounts.notPauseai}</FieldError>}
        {waiting && <Hint>{staffCopy.accounts.saveFirst}</Hint>}
      </FieldGroup>
      <SubmitButton variant="primary" size="small" disabled={waiting}>
        {staffCopy.accounts.add}
      </SubmitButton>
    </FilterForm>
  );
}
