import { staffCopy } from "@/lib/content/staff-interface";
import type { Dashboard } from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import StaffDashboard from "./StaffDashboard";

type Props = {
  /** Whether they have an account. Without one: just whom to ask. */
  account: boolean;
  permissions: Permission[];
  /** The admins, to ask. */
  admins: string[];
  /** The week's numbers and the imports' endings, for someone with an account. */
  dashboard?: Dashboard;
};

/**
 * The home page's body: without an account, whom to ask for one; with
 * one, the dashboard, and if they have no permissions, whom to ask for
 * them. The pages and permissions are in the sidebar.
 */
export default function StaffHome({ account, permissions, admins, dashboard }: Props) {
  const who = admins.join(", ");
  if (!account) {
    return (
      <>
        <h1>{staffCopy.home.title}</h1>
        <p>
          {staffCopy.home.noAccount} {staffCopy.home.ask(who)}
        </p>
      </>
    );
  }
  return (
    <>
      <h1>{staffCopy.home.title}</h1>
      {permissions.length === 0 && (
        <p>
          {staffCopy.home.none} {staffCopy.home.ask(who)}
        </p>
      )}
      {dashboard && <StaffDashboard dashboard={dashboard} permissions={permissions} />}
    </>
  );
}
