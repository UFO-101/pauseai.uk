import { Button } from "@/components/ui/Button";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { importFromAirtable } from "../actions";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

type Search = { matched?: string; added?: string; alreadySet?: string; unconfigured?: string };

export default async function ImportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { matched, added, alreadySet, unconfigured } = await searchParams;
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.import.title}</h1>
      <p>{staffCopy.import.intro}</p>
      {unconfigured && <p className={styles.error}>{staffCopy.import.notConfigured}</p>}
      {matched !== undefined && (
        <p role="status">{staffCopy.import.result({ matched: Number(matched), added: Number(added), alreadySet: Number(alreadySet) })}</p>
      )}
      <form action={importFromAirtable}>
        <Button variant="primary" size="small" type="submit">
          {staffCopy.import.button}
        </Button>
      </form>
    </main>
  );
}
