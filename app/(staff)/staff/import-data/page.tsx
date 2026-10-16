import { ButtonLink } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import type { ControlAiImport, ImportJob, MpCheck, SignatoryImport } from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/airtable";
import { latestRun } from "@/lib/server/import-runs";
import { syncsToShow } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { checkNow, decideSync, importControlAiNow, importFromAirtable, syncNow } from "../actions";
import RunList from "../_components/RunList";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

const only = <Run,>(run: Run | undefined) => (run ? [run] : []);

/** A job's button, with the way to all its runs beside it. */
function Actions({ action, label, job }: { action: () => Promise<void>; label: string; job: ImportJob }) {
  return (
    <div className={styles.actions}>
      <form action={action}>
        <SubmitButton variant="primary" size="small">
          {label}
        </SubmitButton>
      </form>
      <ButtonLink variant="ghost" size="small" href={`/staff/import-history?job=${job}`}>
        {staffCopy.history.showAll}
      </ButtonLink>
    </div>
  );
}

/**
 * Every import and check: the MPs from Airtable and the check of them against
 * Parliament, the signatories from Airtable, and ControlAI's letter from the
 * web. Each with its newest run.
 */
export default async function ImportPage() {
  const { email } = await requireStaff();
  const [syncs, check, signatoryImport, controlAiImport] = await Promise.all([
    syncsToShow(),
    latestRun<MpCheck>("check-mps"),
    latestRun<SignatoryImport>("import-signatories"),
    latestRun<ControlAiImport>("import-controlai"),
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
      <Actions action={syncNow} label={staffCopy.syncs.syncNow} job="sync-mps" />
      <RunList runs={syncs} none={staffCopy.syncs.none} decide={decideSync} />

      <h2>
        {staffCopy.check.title} <span className={`${styles.tag} ${styles.web}`}>{staffCopy.import.web}</span>
        <span className={`${styles.tag} ${styles.nightly}`}>{staffCopy.import.nightly}</span>
        <span className={styles.tag}>{staffCopy.import.checkOnly}</span>
      </h2>
      <p>
        {staffCopy.check.intro.before}
        <a href={MEMBERS_API}>{staffCopy.check.intro.link}</a>
        {staffCopy.check.intro.after}
      </p>
      <Actions action={checkNow} label={staffCopy.check.checkNow} job="check-mps" />
      <RunList runs={only(check)} none={staffCopy.check.never} />

      <h2>
        {staffCopy.import.title} <span className={`${styles.tag} ${styles.airtable}`}>{staffCopy.import.airtable}</span>
        <span className={styles.tag}>{staffCopy.import.oneOff}</span>
      </h2>
      <p>
        {staffCopy.import.intro.before}
        <a href={PARLIAMENTARIANS_TABLE_URL}>{staffCopy.import.intro.link}</a>
        {staffCopy.import.intro.after}
      </p>
      <Actions action={importFromAirtable} label={staffCopy.import.button} job="import-signatories" />
      <RunList runs={only(signatoryImport)} none={staffCopy.import.none} />

      <h2>
        {staffCopy.controlAi.title} <span className={`${styles.tag} ${styles.web}`}>{staffCopy.import.web}</span>
        <span className={`${styles.tag} ${styles.nightly}`}>{staffCopy.import.nightly}</span>
      </h2>
      <p>
        {staffCopy.controlAi.intro.before}
        <a href={CONTROLAI_LETTER_PAGE}>{staffCopy.controlAi.intro.link}</a>
        {staffCopy.controlAi.intro.after}
      </p>
      <Actions action={importControlAiNow} label={staffCopy.controlAi.importNow} job="import-controlai" />
      <RunList runs={only(controlAiImport)} none={staffCopy.controlAi.never} />
    </main>
  );
}
