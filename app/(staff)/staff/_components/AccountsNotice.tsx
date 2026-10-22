import { staffCopy } from "@/lib/content/staff-interface";
import Alert from "./Alert";

/** After a change on the accounts page that was refused: why, as an error. Nothing otherwise. */
export default function AccountsNotice({ notice }: { notice: string }) {
  if (notice === "last-admin") return <Alert>{staffCopy.accounts.lastAdmin}</Alert>;
  return null;
}
