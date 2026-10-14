import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { latestCheck } from "@/lib/server/mp-check";
import { requireStaff } from "@/lib/server/staff-auth";
import { checkNow } from "../actions";
import MpCheckList from "../_components/MpCheckList";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

export default async function MpCheckPage() {
  const { email } = await requireStaff();
  const check = await latestCheck();
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.check.title}</h1>
      <p>{staffCopy.check.intro}</p>
      <form action={checkNow}>
        <Button variant="primary" size="small" type="submit">
          {staffCopy.check.checkNow}
        </Button>
      </form>
      <MpCheckList check={check} />
    </main>
  );
}
