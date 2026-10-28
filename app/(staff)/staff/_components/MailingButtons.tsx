import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./MailingButtons.module.css";

const copy = staffCopy.mailingPages;

/** A form's action, as a Server Action takes it. */
type FormAction = (form: FormData) => void | Promise<void>;

/**
 * Delete draft: a button that opens a box asking to be sure, whose button
 * deletes draft `id`. A draft has sent nothing, so it isn't kept.
 */
export function DeleteDraft({ id, action }: { id: number; action: FormAction }) {
  const box = `delete-draft-${id}`;
  return (
    <>
      <Button variant="ghost" size="small" fit popoverTarget={box}>
        {copy.deleteDraft}
      </Button>
      <form id={box} popover="auto" action={action} className={styles.confirm}>
        <input type="hidden" name="id" value={id} />
        <p>{copy.confirmDelete}</p>
        <SubmitButton variant="danger" size="small" fit>
          {copy.deleteIt}
        </SubmitButton>
      </form>
    </>
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
