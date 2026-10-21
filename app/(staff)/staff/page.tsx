import { requireStaff } from "@/lib/server/staff-auth";
import { admins } from "@/lib/server/staff-permissions";
import StaffHome from "./_components/StaffHome";
import StaffNav from "./_components/StaffNav";
import StaffPage from "./_components/ui/StaffPage";

/** The staff home: the pages this staff member can see, in groups, and whom to ask for more. */
export default async function StaffHomePage() {
  const staff = await requireStaff();
  return (
    <StaffPage nav={<StaffNav email={staff.email} permissions={staff.permissions} current="home" />}>
      <StaffHome permissions={staff.permissions} admins={await admins()} />
    </StaffPage>
  );
}
