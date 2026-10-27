import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./DeletePolitician.module.css";

const copy = staffCopy.politician.delete;

/**
 * At the foot of the page of a politician whose record has gone from
 * Airtable, out of the way: the red button, with a note of why they can be
 * deleted. It opens a box asking to be sure, whose button deletes them.
 * Nothing for anyone who can't be deleted (`deletable`).
 */
export default function DeletePolitician({
  politician,
  deletable = true,
  action,
}: {
  politician: { id: number; name: string };
  deletable?: boolean;
  action: (form: FormData) => void | Promise<void>;
}) {
  if (!deletable) return null;
  return (
    <div className={styles.delete}>
      <Button variant="danger" size="small" popoverTarget="delete-politician">
        {copy.button}
      </Button>
      <Muted>{copy.note}</Muted>
      <form id="delete-politician" popover="auto" action={action} className={styles.confirm}>
        <input type="hidden" name="politicianId" value={politician.id} />
        <p>{copy.sure(politician.name)}</p>
        <SubmitButton variant="danger" size="small">
          {copy.confirm}
        </SubmitButton>
      </form>
    </div>
  );
}
