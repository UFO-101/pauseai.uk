import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { DeleteTwice } from "./DeleteTwice";
import styles from "./DeletePolitician.module.css";

const copy = staffCopy.politician.delete;

/**
 * At the foot of the page of a politician whose record has gone from
 * Airtable, out of the way: Delete, pressed twice, with a note of why they
 * can be deleted. Nothing for anyone who can't be deleted (`deletable`).
 */
export default function DeletePolitician({
  politician,
  deletable = true,
  action,
}: {
  politician: { id: number };
  deletable?: boolean;
  action: (form: FormData) => void | Promise<void>;
}) {
  if (!deletable) return null;
  return (
    <div className={styles.delete}>
      <DeleteTwice name="politicianId" value={String(politician.id)} label={copy.button} action={action} />
      <Muted>{copy.note}</Muted>
    </div>
  );
}
