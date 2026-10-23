import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Dashboard } from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import StaffDashboard from "./StaffDashboard";
import styles from "./StaffHome.module.css";

/**
 * The home page's body: the dashboard under a title only screen readers
 * hear; at its foot, only with more than one session open, a quiet line
 * saying how many, with a button to end them all. The pages and
 * permissions are in the sidebar.
 */
export default function StaffHome({
  permissions,
  dashboard,
  sessions,
  logOutEverywhere,
}: {
  permissions: Permission[];
  dashboard: Dashboard;
  /** This staff member's sessions open. */
  sessions: number;
  logOutEverywhere: (form: FormData) => void | Promise<void>;
}) {
  return (
    <>
      <h1 className={styles.title}>{staffCopy.home.title}</h1>
      <StaffDashboard dashboard={dashboard} permissions={permissions} />
      {sessions > 1 && (
        <form action={logOutEverywhere} className={styles.sessions}>
          <Muted>{staffCopy.home.sessions(sessions)}</Muted>{" "}
          <SubmitButton variant="ghost" size="small" fit>
            {staffCopy.home.logOutEverywhere}
          </SubmitButton>
        </form>
      )}
    </>
  );
}
