import StatusMessage from "@/components/ui/StatusMessage";
import { staffCopy } from "@/lib/content/staff-interface";

/** After a change on the accounts page that was refused: why. Nothing otherwise. */
export default function AccountsNotice({ notice }: { notice: string }) {
  if (notice === "last-admin") return <StatusMessage>{staffCopy.accounts.lastAdmin}</StatusMessage>;
  return null;
}
