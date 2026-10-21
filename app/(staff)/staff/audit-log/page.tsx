import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/staff-auth";
import ChangesTable from "../_components/ChangesTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export default async function ChangesPage() {
  const { email, permissions } = await requireStaff();
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="changes" />}>
      <h1>{staffCopy.changes.title}</h1>
      <ChangesTable changes={await recentChanges()} />
    </StaffPage>
  );
}
