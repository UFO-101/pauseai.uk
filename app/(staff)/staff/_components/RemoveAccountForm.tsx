import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

/**
 * The button that removes an account, at the right of its row: a form of
 * its own, sending whose. Off while the table has changes not saved.
 */
export default function RemoveAccountForm({
  email,
  remove,
  disabled = false,
}: {
  email: string;
  remove: (form: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <form action={remove} aria-label={`${staffCopy.accounts.remove}: ${email}`}>
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="ghost" size="small" fit disabled={disabled}>
        {staffCopy.accounts.remove}
      </SubmitButton>
    </form>
  );
}
