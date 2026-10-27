import { requireStaff } from "@/lib/server/staff-auth";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

/**
 * Every signed-in staff page: the page's frame, with the navigation beside
 * it, drawn once and kept as staff move between pages, so only the page
 * changes, once the next one has arrived (StaffLink). Each page still
 * calls requireStaff() for what it needs; this one asks only for an account,
 * for the navigation.
 */
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const { email, permissions, sessions } = await requireStaff();
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} />}>{children}</StaffPage>
  );
}
