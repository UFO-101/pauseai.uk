import { SubmitButton } from "@/components/ui/SubmitButton";
import Actions from "@/components/ui/Actions";

/** A job's button, on its page: runs it now. */
export default function JobActions({ action, label }: { action: () => void | Promise<void>; label: string }) {
  return (
    <Actions>
      <form action={action}>
        <SubmitButton variant="primary" size="small">
          {label}
        </SubmitButton>
      </form>
    </Actions>
  );
}
