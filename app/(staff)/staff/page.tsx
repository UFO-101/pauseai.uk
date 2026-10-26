import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { dashboard } from "@/lib/server/staff-dashboard";
import { dashboardWindow } from "@/lib/staff-dashboard";
import StaffHome from "./_components/StaffHome";
import StaffNav from "./_components/StaffNav";
import StaffPage from "./_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.home.title };

/** The staff home: the dashboard, over the window the URL asks for. The pages this staff member can see, and their sessions, are in the sidebar. */
export default async function StaffHomePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { email, permissions, sessions } = await requireStaff();
  const { days } = await searchParams;
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="home" />}>
      <StaffHome permissions={permissions} dashboard={await dashboard(dashboardWindow(days))} />
    </StaffPage>
  );
}
