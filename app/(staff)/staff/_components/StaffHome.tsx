import { staffCopy } from "@/lib/content/staff-interface";
import type { Dashboard } from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import StaffDashboard from "./StaffDashboard";
import styles from "./StaffHome.module.css";

/** The home page's body: the dashboard under a title only screen readers hear. The pages and permissions are in the sidebar. */
export default function StaffHome({ permissions, dashboard }: { permissions: Permission[]; dashboard: Dashboard }) {
  return (
    <>
      <h1 className={styles.title}>{staffCopy.home.title}</h1>
      <StaffDashboard dashboard={dashboard} permissions={permissions} />
    </>
  );
}
