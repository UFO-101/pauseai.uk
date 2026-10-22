import type { Metadata } from "next";
import { jobTitles } from "@/lib/content/staff-interface";
import { found } from "@/lib/found";
import { type ImportJob, jobBySlug } from "@/lib/import-runs";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { listRuns } from "@/lib/server/import-runs";
import { requireStaff } from "@/lib/server/staff-auth";
import { checkNow, decideSync, importControlAiNow, importFromAirtable, importLumaNow, syncNow } from "../../actions";
import { ImportJobPage } from "../../_components/ImportJob";
import StaffNav from "../../_components/StaffNav";
import StaffPage from "../../_components/ui/StaffPage";

type Params = { params: Promise<{ job: string }> };

/** Each job's button: the Server Action that runs it now. */
const RUN_NOW: Record<ImportJob, () => Promise<void>> = {
  "import-luma": importLumaNow,
  "sync-mps": syncNow,
  "check-mps": checkNow,
  "import-controlai": importControlAiNow,
  "import-signatories": importFromAirtable,
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: jobTitles[found(jobBySlug((await params).job))] };
}

/** One import or check: what it does, its button, and every run it has made, newest first. */
export default async function ImportJobRoute({ params }: Params) {
  const { email, permissions } = await requireStaff();
  const job = found(jobBySlug((await params).job));
  const runs = await listRuns(job);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="import" />}>
      <ImportJobPage
        job={job}
        runs={runs}
        run={RUN_NOW[job]}
        decide={decideSync}
        airtableTable={PARLIAMENTARIANS_TABLE_URL}
      />
    </StaffPage>
  );
}
