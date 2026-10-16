import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/airtable";
import { recentControlAiImports } from "@/lib/server/controlai-import";
import { recentSyncs } from "@/lib/server/mp-sync";
import { recentSignatoryImports } from "@/lib/server/signatory-import";
import { requireStaff } from "@/lib/server/staff-auth";
import { decideSync, importControlAiNow, importFromAirtable, syncNow } from "../actions";
import ControlAiImportList from "../_components/ControlAiImportList";
import SignatoryImportList from "../_components/SignatoryImportList";
import StaffHeader from "../_components/StaffHeader";
import SyncList from "../_components/SyncList";
import styles from "../_components/staff.module.css";

/** Every import: the MPs and the signatories from Airtable, and ControlAI's letter from the web. Each with its recent runs. */
export default async function ImportPage() {
  const { email } = await requireStaff();
  const [syncs, signatoryImports, controlAiImports] = await Promise.all([
    recentSyncs(),
    recentSignatoryImports(),
    recentControlAiImports(),
  ]);
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} current="import" />
      <h1>{staffCopy.import.pageTitle}</h1>

      <h2>
        {staffCopy.syncs.title} <span className={`${styles.tag} ${styles.airtable}`}>{staffCopy.import.airtable}</span>
        <span className={`${styles.tag} ${styles.nightly}`}>{staffCopy.import.nightly}</span>
      </h2>
      <p>
        {staffCopy.syncs.intro.before}
        <a href={PARLIAMENTARIANS_TABLE_URL}>{staffCopy.syncs.intro.link}</a>
        {staffCopy.syncs.intro.after}
      </p>
      <form action={syncNow}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.syncs.syncNow}
        </SubmitButton>
      </form>
      <SyncList runs={syncs} decide={decideSync} />

      <h2>
        {staffCopy.import.title} <span className={`${styles.tag} ${styles.airtable}`}>{staffCopy.import.airtable}</span>
        <span className={styles.tag}>{staffCopy.import.oneOff}</span>
      </h2>
      <p>
        {staffCopy.import.intro.before}
        <a href={PARLIAMENTARIANS_TABLE_URL}>{staffCopy.import.intro.link}</a>
        {staffCopy.import.intro.after}
      </p>
      <form action={importFromAirtable}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.import.button}
        </SubmitButton>
      </form>
      <SignatoryImportList runs={signatoryImports} />

      <h2>
        {staffCopy.controlAi.title} <span className={`${styles.tag} ${styles.web}`}>{staffCopy.import.web}</span>
        <span className={`${styles.tag} ${styles.nightly}`}>{staffCopy.import.nightly}</span>
      </h2>
      <p>
        {staffCopy.controlAi.intro.before}
        <a href={CONTROLAI_LETTER_PAGE}>{staffCopy.controlAi.intro.link}</a>
        {staffCopy.controlAi.intro.after}
      </p>
      <form action={importControlAiNow}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.controlAi.importNow}
        </SubmitButton>
      </form>
      <ControlAiImportList runs={controlAiImports} />
    </main>
  );
}
