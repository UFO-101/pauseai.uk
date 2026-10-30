"use client";

import StaffLink from "./ui/StaffLink";
import Actions from "@/components/ui/Actions";
import { useState } from "react";
import { Checkbox, TextInput } from "@/components/ui/Controls";
import { Field, FieldGroup, Hint } from "@/components/ui/Field";
import { FormStack } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupporterSummary } from "@/lib/supporters";
import styles from "./StaffForms.module.css";

/**
 * The erase page: whose, what will go, the request's reference for the audit
 * log, a box to tick, and the red button, which does nothing until the box
 * is ticked; or the way back.
 */
export default function EraseForm({
  supporter,
  action,
}: {
  supporter: Pick<SupporterSummary, "id" | "name">;
  action: (form: FormData) => void | Promise<void>;
}) {
  const [sure, setSure] = useState(false);
  const copy = staffCopy.erase;
  const supporterId = supporter.id;
  return (
    <>
      <h1>
        {copy.title}: {supporter.name ?? staffCopy.supporters.noName}
      </h1>
      <p>{copy.intro}</p>
      <FormStack action={action} className={styles.form}>
        <input type="hidden" name="id" value={supporterId} />
        <FieldGroup>
          <Field label={copy.referenceLabel}>
            <TextInput name="reference" required />
          </Field>
          <Hint>{copy.referenceHint}</Hint>
        </FieldGroup>
        <Checkbox name="confirm" checked={sure} onChange={setSure}>
          {copy.confirm}
        </Checkbox>
        <Actions>
          <SubmitButton variant="danger" size="small" fit disabled={!sure}>
            {copy.button}
          </SubmitButton>
          <StaffLink href={`/staff/supporters/${supporterId}`}>{copy.cancel}</StaffLink>
        </Actions>
      </FormStack>
    </>
  );
}
