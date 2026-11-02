"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { DeleteTwice } from "./DeleteTwice";

const copy = staffCopy.mailingPages;

/** A form's action, as a Server Action takes it. */
type FormAction = (form: FormData) => void | Promise<void>;

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
