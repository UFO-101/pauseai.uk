import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";

/** The button that removes an account, at the right of its row: a form of its own, sending whose. */
export default function RemoveAccountForm({
  email,
  remove,
}: {
  email: string;
  remove: (form: FormData) => void | Promise<void>;
}) {
  return (
    <form action={remove} aria-label={`${staffCopy.accounts.remove}: ${email}`}>
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="ghost" size="small">
        {staffCopy.accounts.remove}
      </SubmitButton>
    </form>
  );
}
