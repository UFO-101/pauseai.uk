import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { dashboard } from "@/lib/server/staff-dashboard";
import { dashboardWindow } from "@/lib/staff-dashboard";
import StaffHome from "../_components/StaffHome";

export const metadata: Metadata = { title: staffCopy.home.title };

/** The staff home: the dashboard, over the window the URL asks for. The pages this staff member can see, and their sessions, are in the sidebar. */
export default async function StaffHomePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { permissions } = await requireStaff();
  const { days } = await searchParams;
  return (
    <>
      <StaffHome permissions={permissions} dashboard={await dashboard(dashboardWindow(days))} />
    </>
  );
}
