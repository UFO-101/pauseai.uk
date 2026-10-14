import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { requireStaff } from "@/lib/server/staff-auth";
import ChangesTable from "../_components/ChangesTable";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

export default async function ChangesPage() {
  const { email } = await requireStaff();
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.changes.title}</h1>
      <ChangesTable changes={await recentChanges()} />
    </main>
  );
}
