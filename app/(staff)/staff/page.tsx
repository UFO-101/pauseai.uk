import { requireStaff } from "@/lib/server/staff-auth";
import { admins } from "@/lib/server/staff-accounts";
import { dashboard } from "@/lib/server/staff-dashboard";
import StaffHome from "./_components/StaffHome";
import StaffNav from "./_components/StaffNav";
import StaffPage from "./_components/ui/StaffPage";

/** The staff home: the dashboard and the pages this staff member can see, in groups, or without an account, whom to ask. */
export default async function StaffHomePage() {
  const staff = await requireStaff("login");
  return (
    <StaffPage
      nav={<StaffNav email={staff.email} account={staff.account} permissions={staff.permissions} current="home" />}
    >
      <StaffHome
        account={staff.account}
        permissions={staff.permissions}
        admins={await admins()}
        dashboard={staff.account ? await dashboard() : undefined}
      />
    </StaffPage>
  );
}
