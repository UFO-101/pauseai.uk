import { TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EmailBlock } from "@/lib/server/email";

/**
 * Unblocks an address, with a note of why for the audit log: on the
 * addresses page and a politician's page. A complaint can't be unblocked.
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
      <Field label={staffCopy.emails.note}>
        <TextInput name="note" />
      </Field>
      <SubmitButton variant="ghost" size="small">
        {staffCopy.emails.unblock}
      </SubmitButton>
    </FilterForm>
  );
}
