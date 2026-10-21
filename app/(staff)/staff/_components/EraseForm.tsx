"use client";

import { useState } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { Field, Hint } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./StaffForms.module.css";

/**
 * Erasing a supporter, at the foot of their page: what will go, the
 * request's reference for the audit log, a box to tick, and the button,
 * which does nothing until the box is ticked.
 */
export default function EraseForm({
  supporterId,
  action,
}: {
  supporterId: number;
  action: (form: FormData) => void | Promise<void>;
}) {
  const [sure, setSure] = useState(false);
  const copy = staffCopy.erase;
  return (
    <section aria-labelledby="erase-title">
      <h2 id="erase-title">{copy.title}</h2>
      <p>{copy.intro}</p>
      <FormStack action={action} className={styles.form}>
        <input type="hidden" name="id" value={supporterId} />
        <Field label={copy.referenceLabel}>
          <TextInput name="reference" required />
        </Field>
        <Hint>{copy.referenceHint}</Hint>
        <Checkbox name="confirm" checked={sure} onChange={setSure}>
          {copy.confirm}
        </Checkbox>
        <SubmitButton variant="ghost" size="small" disabled={!sure}>
          {copy.button}
        </SubmitButton>
      </FormStack>
    </section>
  );
}
