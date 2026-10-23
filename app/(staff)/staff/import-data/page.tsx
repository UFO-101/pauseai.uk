import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { latestRun } from "@/lib/server/import-runs";
import { requireStaff } from "@/lib/server/staff-auth";
import { ImportOverview } from "../_components/ImportJob";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.import.pageTitle };

/** Every import and check, a card each, with how its newest run ended; each card opens the job's page. */
export default async function ImportPage() {
  const { email, permissions } = await requireStaff();
  const newest = await Promise.all(IMPORT_JOBS.map((job) => latestRun(job)));
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="import" />}>
      <ImportOverview newest={newest} airtableTable={PARLIAMENTARIANS_TABLE_URL} />
    </StaffPage>
  );
}
