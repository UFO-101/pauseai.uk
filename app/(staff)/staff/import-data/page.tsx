import { staffCopy } from "@/lib/content/staff-interface";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { site } from "@/lib/content/site";
import { asList, type ControlAiImport, type LumaImport, type MpCheck, type SignatoryImport } from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { latestRun } from "@/lib/server/import-runs";
import { syncsToShow } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { checkNow, decideSync, importControlAiNow, importFromAirtable, importLumaNow, syncNow } from "../actions";
import JobActions from "../_components/JobActions";
import RunList from "../_components/RunList";
import StaffHeader from "../_components/StaffHeader";
import StaffPage from "../_components/ui/StaffPage";
import Tag from "@/components/ui/Tag";

/**
 * Every import and check: the MPs from Airtable and the check of them against
 * Parliament, the signatories from Airtable, and ControlAI's letter from the
 * web. Each with its newest run.
 */
export default async function ImportPage() {
  const { email } = await requireStaff();
  const [syncs, check, signatoryImport, controlAiImport, lumaImport] = await Promise.all([
    syncsToShow(),
    latestRun<MpCheck>("check-mps"),
    latestRun<SignatoryImport>("import-signatories"),
    latestRun<ControlAiImport>("import-controlai"),
    latestRun<LumaImport>("import-luma"),
  ]);
  return (
    <StaffPage>
      <StaffHeader email={email} current="import" />
      <h1>{staffCopy.import.pageTitle}</h1>

      <h2>
        {staffCopy.syncs.title} <Tag tone="amber">{staffCopy.import.airtable}</Tag>
        <Tag tone="blue">{staffCopy.import.nightly}</Tag>
      </h2>
      <p>
        {staffCopy.syncs.intro.before}
        <a href={PARLIAMENTARIANS_TABLE_URL}>{staffCopy.syncs.intro.link}</a>
        {staffCopy.syncs.intro.after} {staffCopy.syncs.testMps}
      </p>
      <JobActions action={syncNow} label={staffCopy.syncs.syncNow} job="sync-mps" />
      <RunList runs={syncs} none={staffCopy.syncs.none} decide={decideSync} />

      <h2>
        {staffCopy.check.title} <Tag tone="green">{staffCopy.import.web}</Tag>
        <Tag tone="blue">{staffCopy.import.nightly}</Tag>
        <Tag>{staffCopy.import.checkOnly}</Tag>
      </h2>
      <p>
        {staffCopy.check.intro.before}
        <a href={MEMBERS_API}>{staffCopy.check.intro.link}</a>
        {staffCopy.check.intro.after}
      </p>
      <JobActions action={checkNow} label={staffCopy.check.checkNow} job="check-mps" />
      <RunList runs={asList(check)} none={staffCopy.check.never} />

      <h2>
        {staffCopy.import.title} <Tag tone="amber">{staffCopy.import.airtable}</Tag>
        <Tag>{staffCopy.import.oneOff}</Tag>
      </h2>
      <p>
        {staffCopy.import.intro.before}
        <a href={PARLIAMENTARIANS_TABLE_URL}>{staffCopy.import.intro.link}</a>
        {staffCopy.import.intro.after}
      </p>
      <JobActions action={importFromAirtable} label={staffCopy.import.button} job="import-signatories" />
      <RunList runs={asList(signatoryImport)} none={staffCopy.import.none} />

      <h2>
        {staffCopy.controlAi.title} <Tag tone="green">{staffCopy.import.web}</Tag>
        <Tag tone="blue">{staffCopy.import.nightly}</Tag>
      </h2>
      <p>
        {staffCopy.controlAi.intro.before}
        <a href={CONTROLAI_LETTER_PAGE}>{staffCopy.controlAi.intro.link}</a>
        {staffCopy.controlAi.intro.after}
      </p>
      <JobActions action={importControlAiNow} label={staffCopy.controlAi.importNow} job="import-controlai" />
      <RunList runs={asList(controlAiImport)} none={staffCopy.controlAi.never} />

      <h2>
        {staffCopy.luma.title} <Tag tone="amber">{staffCopy.import.luma}</Tag>
        <Tag tone="blue">{staffCopy.import.hourly}</Tag>
      </h2>
      <p>
        {staffCopy.luma.intro.before}
        <a href={site.social.luma} target="_blank" rel="noreferrer">
          {staffCopy.luma.intro.link}
        </a>
        {staffCopy.luma.intro.after}
      </p>
      <JobActions action={importLumaNow} label={staffCopy.luma.importNow} job="import-luma" />
      <RunList runs={asList(lumaImport)} none={staffCopy.luma.never} />
    </StaffPage>
  );
}
