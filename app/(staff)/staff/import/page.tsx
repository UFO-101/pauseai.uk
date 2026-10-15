import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentSyncs } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { decideSync, importFromAirtable, syncNow } from "../actions";
import StaffHeader from "../_components/StaffHeader";
import SyncList from "../_components/SyncList";
import styles from "../_components/staff.module.css";

type Search = { matched?: string; added?: string; alreadySet?: string; unconfigured?: string };

/** Both imports from Airtable: the MPs (also run nightly), and the signatories. */
export default async function ImportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { matched, added, alreadySet, unconfigured } = await searchParams;
  const syncs = await recentSyncs();
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
    </main>
  );
}
