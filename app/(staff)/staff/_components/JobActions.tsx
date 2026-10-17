import { ButtonLink } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { ImportJob } from "@/lib/import-runs";
import Actions from "./ui/Actions";

/** An import's button, on the import page, with the way to all its runs beside it. */
export default function JobActions({
  action,
  label,
  job,
}: {
  action: () => void | Promise<void>;
  label: string;
  job: ImportJob;
}) {
  return (
    <Actions>
      <form action={action}>
        <SubmitButton variant="primary" size="small">
          {label}
        </SubmitButton>
      </form>
      <ButtonLink variant="ghost" size="small" href={`/staff/import-history?job=${job}`}>
        {staffCopy.history.showAll}
      </ButtonLink>
    </Actions>
  );
}
