import { TextInput } from "@/components/ui/Controls";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailBlock } from "@/lib/server/email";
import styles from "./UnblockForm.module.css";

/**
 * Unblocks an address, with a note of why for the audit log, which it
 * won't send without: on the addresses page and a politician's page. The
 * field has no label above it; its question is in it, and is its name. A
 * complaint can't be unblocked.
 */
export default function UnblockForm({
  block,
  action,
}: {
  block: Pick<EmailBlock, "address" | "canReset">;
  action: (form: FormData) => void | Promise<void>;
}) {
  if (!block.canReset) return <Muted>{staffCopy.emails.cantReset}</Muted>;
  return (
    <FilterForm action={action} aria-label={`${staffCopy.emails.unblock}: ${block.address}`}>
      <input type="hidden" name="address" value={block.address} />
      <span className={styles.why}>
        <TextInput name="note" required aria-label={staffCopy.emails.note} placeholder={staffCopy.emails.note} />
      </span>
      <SubmitButton variant="primary" size="small">
        {staffCopy.emails.unblock}
      </SubmitButton>
    </FilterForm>
  );
}
