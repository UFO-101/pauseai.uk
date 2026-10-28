"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

const copy = staffCopy.mailingPages;

/** A form's action, as a Server Action takes it. */
type FormAction = (form: FormData) => void | Promise<void>;

/** How long Delete draft waits for its second press. */
const ARMED_FOR = 4000;

/**
 * Delete draft, pressed twice: the first press turns it red, asking for a
 * second, which deletes draft `id`; it turns back if the second doesn't
 * come within ARMED_FOR, or focus goes elsewhere. A draft has sent nothing,
 * so it isn't kept.
 */
export function DeleteDraft({ id, action }: { id: number; action: FormAction }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_FOR);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <SubmitButton variant="danger" size="small" fit autoFocus onBlur={() => setArmed(false)}>
          {copy.deleteIt}
        </SubmitButton>
      ) : (
        <Button variant="ghost" size="small" fit type="button" onClick={() => setArmed(true)}>
          {copy.deleteDraft}
        </Button>
      )}
    </form>
  );
}

/** Stop, for mailing `id`: a scheduled one becomes a draft again, one sending sends no more. */
export function StopMailing({ id, label, action }: { id: number; label: string; action: FormAction }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" size="small" fit>
        {label}
      </SubmitButton>
    </form>
  );
}
