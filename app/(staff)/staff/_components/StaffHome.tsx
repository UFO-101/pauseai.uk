import { staffCopy } from "@/lib/content/staff-interface";
import type { Dashboard } from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import { staffDay } from "@/lib/staff-time";
import StaffDashboard from "./StaffDashboard";
import PageIntro from "./ui/PageIntro";

/** The home page's body: its title, the day under it, and the dashboard. The pages and permissions are in the sidebar. */
export default function StaffHome({ permissions, dashboard }: { permissions: Permission[]; dashboard: Dashboard }) {
  return (
    <>
      <h1>{staffCopy.home.title}</h1>
      <PageIntro>{staffDay(dashboard.asOf)}</PageIntro>
      <StaffDashboard dashboard={dashboard} permissions={permissions} />
    </>
  );
}
