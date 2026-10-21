import { staffCopy } from "@/lib/content/staff-interface";
import { listRuns } from "@/lib/server/import-runs";
import { requireStaff } from "@/lib/server/staff-auth";
import { historySearch } from "@/lib/staff-search";
import RunFilters from "../_components/RunFilters";
import RunList from "../_components/RunList";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

type Search = { job?: string };

/** Every run of every import and check, newest first, or one job's. */
export default async function ImportHistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email, permissions } = await requireStaff();
  const { job, filter } = historySearch(await searchParams);
  const runs = await listRuns(filter);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="history" />}>
      <h1>{staffCopy.history.title}</h1>
      <RunFilters job={job} />
      <RunList runs={runs} none={staffCopy.history.none} history />
    </StaffPage>
  );
}
