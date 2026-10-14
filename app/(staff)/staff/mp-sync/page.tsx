import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentSyncs } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { decideSync, syncNow } from "../actions";
import StaffHeader from "../_components/StaffHeader";
import SyncList from "../_components/SyncList";
import styles from "../_components/staff.module.css";

export default async function MpSyncPage() {
  const { email } = await requireStaff();
  const syncs = await recentSyncs();
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.syncs.title}</h1>
      <p>{staffCopy.syncs.intro}</p>
      <form action={syncNow}>
        <Button variant="primary" size="small" type="submit">
          {staffCopy.syncs.syncNow}
        </Button>
      </form>
      <SyncList syncs={syncs} decide={decideSync} />
    </main>
  );
}
