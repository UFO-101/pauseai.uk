import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { IMPORT_JOBS } from "@/lib/import-runs";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { currentPress, latestRun } from "@/lib/server/import-runs";
import { requireStaff } from "@/lib/server/staff-auth";
import { ImportOverview } from "../../_components/ImportJob";

export const metadata: Metadata = { title: staffCopy.import.pageTitle };

/** Every import and check, a card each, with how its newest run ended; each card opens the job's page. */
export default async function ImportPage() {
  await requireStaff();
  const [newest, presses] = await Promise.all([
    Promise.all(IMPORT_JOBS.map((job) => latestRun(job))),
    Promise.all(IMPORT_JOBS.map((job) => currentPress(job))),
  ]);
  return (
    <>
      <ImportOverview newest={newest} presses={presses} airtableTable={PARLIAMENTARIANS_TABLE_URL} />
    </>
  );
}
