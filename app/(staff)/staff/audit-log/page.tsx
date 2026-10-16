import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/staff-auth";
import ChangesTable from "../_components/ChangesTable";
import StaffHeader from "../_components/StaffHeader";
import StaffPage from "../_components/ui/StaffPage";

export default async function ChangesPage() {
  const { email } = await requireStaff();
  return (
    <StaffPage>
      <StaffHeader email={email} current="changes" />
      <h1>{staffCopy.changes.title}</h1>
      <ChangesTable changes={await recentChanges()} />
    </StaffPage>
  );
}
