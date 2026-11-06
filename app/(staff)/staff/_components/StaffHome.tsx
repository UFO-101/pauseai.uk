import { staffCopy } from "@/lib/content/staff-interface";
import type { Dashboard } from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import StaffDashboard from "./StaffDashboard";

/** The home page's body: its title, and the dashboard. The pages and permissions are in the sidebar. */
export default function StaffHome({ permissions, dashboard }: { permissions: Permission[]; dashboard: Dashboard }) {
  return (
    <>
      <h1>{staffCopy.home.title}</h1>
      <StaffDashboard dashboard={dashboard} permissions={permissions} />
    </>
  );
}
