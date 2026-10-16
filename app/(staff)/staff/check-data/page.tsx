import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { MEMBERS_API } from "@/lib/parliament";
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
      <StaffHeader email={email} current="check" />
      <h1>{staffCopy.check.pageTitle}</h1>

      <h2>
        {staffCopy.check.title} <span className={`${styles.tag} ${styles.web}`}>{staffCopy.import.web}</span>
        <span className={`${styles.tag} ${styles.nightly}`}>{staffCopy.import.nightly}</span>
      </h2>
      <p>
        {staffCopy.check.intro.before}
        <a href={MEMBERS_API}>{staffCopy.check.intro.link}</a>
        {staffCopy.check.intro.after}
      </p>
      <form action={checkNow}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.check.checkNow}
        </SubmitButton>
      </form>
      <MpCheckList check={check} />
    </main>
  );
}
