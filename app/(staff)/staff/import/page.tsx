import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { latestControlAiImport } from "@/lib/server/controlai-import";
import { recentSyncs } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { decideSync, importControlAiNow, importFromAirtable, syncNow } from "../actions";
import ControlAiImportResult from "../_components/ControlAiImportResult";
import StaffHeader from "../_components/StaffHeader";
import SyncList from "../_components/SyncList";
import styles from "../_components/staff.module.css";

type Search = { matched?: string; added?: string; alreadySet?: string; unconfigured?: string };

/** The imports: the MPs from Airtable (also run nightly), the signatories from Airtable, and ControlAI's letter (also nightly). */
export default async function ImportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { matched, added, alreadySet, unconfigured } = await searchParams;
  const [syncs, controlAi] = await Promise.all([recentSyncs(), latestControlAiImport()]);
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.import.pageTitle}</h1>

      <h2>{staffCopy.syncs.title}</h2>
      <p>{staffCopy.syncs.intro}</p>
      <form action={syncNow}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.syncs.syncNow}
        </SubmitButton>
      </form>
      <SyncList syncs={syncs} decide={decideSync} />

      <h2>{staffCopy.import.title}</h2>
      <p>{staffCopy.import.intro}</p>
      {unconfigured && <p className={styles.error}>{staffCopy.import.notConfigured}</p>}
      {matched !== undefined && (
        <p role="status">
          {staffCopy.import.result({ matched: Number(matched), added: Number(added), alreadySet: Number(alreadySet) })}
        </p>
      )}
      <form action={importFromAirtable}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.import.button}
        </SubmitButton>
      </form>

      <h2>{staffCopy.controlAi.title}</h2>
      <p>{staffCopy.controlAi.intro}</p>
      <form action={importControlAiNow}>
        <SubmitButton variant="primary" size="small">
          {staffCopy.controlAi.importNow}
        </SubmitButton>
      </form>
      <ControlAiImportResult run={controlAi} />
    </main>
  );
}
