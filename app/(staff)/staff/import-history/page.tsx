import { staffCopy } from "@/lib/content/staff-interface";
import { isImportJob } from "@/lib/import-runs";
import { listRuns } from "@/lib/server/import-runs";
import { requireStaff } from "@/lib/server/staff-auth";
import RunFilters from "../_components/RunFilters";
import RunList from "../_components/RunList";
import StaffHeader from "../_components/StaffHeader";
import styles from "../_components/staff.module.css";

type Search = { job?: string };

/** Every run of every import and check, newest first, or one job's. */
export default async function ImportHistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { job = "" } = await searchParams;
  const runs = await listRuns(isImportJob(job) ? job : undefined);
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} current="history" />
      <h1>{staffCopy.history.title}</h1>
      <RunFilters job={job} />
      <RunList runs={runs} none={staffCopy.history.none} history />
    </main>
  );
}
