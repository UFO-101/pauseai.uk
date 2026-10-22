import { requireStaff } from "@/lib/server/staff-auth";
import { admins } from "@/lib/server/staff-accounts";
import { dashboard } from "@/lib/server/staff-dashboard";
import { dashboardWindow } from "@/lib/staff-dashboard";
import StaffHome from "./_components/StaffHome";
import StaffNav from "./_components/StaffNav";
import StaffPage from "./_components/ui/StaffPage";

/** The staff home: the dashboard, over the window the URL asks for, and the pages this staff member can see; or without an account, whom to ask. */
export default async function StaffHomePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const staff = await requireStaff("login");
  const { days } = await searchParams;
  return (
    <StaffPage
      nav={<StaffNav email={staff.email} account={staff.account} permissions={staff.permissions} current="home" />}
    >
      <StaffHome
        account={staff.account}
        permissions={staff.permissions}
        admins={await admins()}
        dashboard={await dashboard(dashboardWindow(days))}
      />
    </StaffPage>
  );
}
