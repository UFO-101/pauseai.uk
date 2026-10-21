import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { listStaffPermissions } from "@/lib/server/staff-permissions";
import { setPermissions } from "../actions";
import PermissionsTable from "../_components/PermissionsTable";
import StaffHeader from "../_components/StaffHeader";
import StaffPage from "../_components/ui/StaffPage";

/** Who may do what, for admins to change. */
export default async function PermissionsPage() {
  const { email } = await requireStaff("admin");
  return (
    <StaffPage>
      <StaffHeader email={email} current="permissions" />
      <h1>{staffCopy.permissions.title}</h1>
      <p>{staffCopy.permissions.intro}</p>
      <PermissionsTable staff={await listStaffPermissions()} action={setPermissions} />
    </StaffPage>
  );
}
