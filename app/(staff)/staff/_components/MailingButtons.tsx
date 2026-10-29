"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

const copy = staffCopy.mailingPages;

/** A form's action, as a Server Action takes it. */
type FormAction = (form: FormData) => void | Promise<void>;

/** How long a delete waits for its second press. */
const ARMED_FOR = 4000;

/**
 * A delete button, pressed twice: the first press turns it red, asking for
 * a second, which sends the form, with `name` set to `value`; it turns back
 * if the second doesn't come within ARMED_FOR, or focus goes elsewhere.
 */
export function DeleteTwice({
  name,
  value,
  label,
  disabled = false,
  action,
}: {
  name: string;
  value: string;
  label: string;
  disabled?: boolean;
  action: FormAction;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_FOR);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      {armed ? (
        <SubmitButton variant="danger" size="small" fit autoFocus onBlur={() => setArmed(false)}>
          {copy.deleteIt}
        </SubmitButton>
      ) : (
        <Button variant="ghost" size="small" fit type="button" disabled={disabled} onClick={() => setArmed(true)}>
          {label}
        </Button>
      )}
    </form>
  );
}

/** Delete draft, pressed twice, for draft `id`. A draft has sent nothing, so it isn't kept. */
export function DeleteDraft({ id, action }: { id: number; action: FormAction }) {
  return <DeleteTwice name="id" value={String(id)} label={copy.deleteDraft} action={action} />;
}

/**
 * Unschedule or Stop sending, for mailing `id`: a scheduled one becomes a
 * draft again, one sending sends no more. Small in a list; `full`, the full
 * height, on the mailing's own page.
 */
export function StopMailing({
  id,
  label,
  action,
  full = false,
}: {
  id: number;
  label: string;
  action: FormAction;
  full?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="primary" size={full ? undefined : "small"} fit>
        {label}
      </SubmitButton>
    </form>
  );
}
