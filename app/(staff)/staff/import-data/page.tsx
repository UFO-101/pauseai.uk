import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { site } from "@/lib/content/site";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { asList, type ControlAiImport, type LumaImport, type MpCheck, type SignatoryImport } from "@/lib/import-runs";
import { MEMBERS_API } from "@/lib/parliament";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { latestRun } from "@/lib/server/import-runs";
import { syncsToShow } from "@/lib/server/mp-sync";
import { requireStaff } from "@/lib/server/staff-auth";
import { checkNow, decideSync, importControlAiNow, importFromAirtable, importLumaNow, syncNow } from "../actions";
import ImportCard, { ImportCards } from "../_components/ImportCard";
import JobActions from "../_components/JobActions";
import RunList from "../_components/RunList";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";
import Tag from "@/components/ui/Tag";

/**
 * Every import and check, a card each: the MPs from Airtable and the check
 * of them against Parliament, the signatories from Airtable, ControlAI's
 * letter from the web, and the Luma calendar. Each with its newest run.
 */
export const metadata: Metadata = { title: staffCopy.import.pageTitle };

export default async function ImportPage() {
  const { email, permissions } = await requireStaff();
  const [syncs, check, signatoryImport, controlAiImport, lumaImport] = await Promise.all([
    syncsToShow(),
    latestRun<MpCheck>("check-mps"),
    latestRun<SignatoryImport>("import-signatories"),
    latestRun<ControlAiImport>("import-controlai"),
    latestRun<LumaImport>("import-luma"),
  ]);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="import" />}>
      <h1>{staffCopy.import.pageTitle}</h1>
      <ImportCards>
        <ImportCard
          title={
            <>
              {staffCopy.luma.title} <Tag tone="amber">{staffCopy.import.luma}</Tag>
              <Tag tone="blue">{staffCopy.import.hourly}</Tag>
            </>
          }
          intro={
            <>
              {staffCopy.luma.intro.before}
              <a href={site.social.luma} target="_blank" rel="noreferrer">
                {staffCopy.luma.intro.link}
              </a>
              {staffCopy.luma.intro.after}
            </>
          }
          actions={<JobActions action={importLumaNow} label={staffCopy.luma.importNow} job="import-luma" />}
        >
          <RunList runs={asList(lumaImport)} none={staffCopy.luma.never} />
        </ImportCard>
        <ImportCard
          title={
            <>
              {staffCopy.syncs.title} <Tag tone="amber">{staffCopy.import.airtable}</Tag>
              <Tag tone="blue">{staffCopy.import.nightly}</Tag>
            </>
          }
          intro={
            <>
              {staffCopy.syncs.intro.before}
              <a href={PARLIAMENTARIANS_TABLE_URL} target="_blank" rel="noreferrer">
                {staffCopy.syncs.intro.link}
              </a>
              {staffCopy.syncs.intro.after} {staffCopy.syncs.testMps}
            </>
          }
          actions={<JobActions action={syncNow} label={staffCopy.syncs.syncNow} job="sync-mps" />}
        >
          <RunList runs={syncs} none={staffCopy.syncs.none} decide={decideSync} />
        </ImportCard>

        <ImportCard
          title={
            <>
              {staffCopy.check.title} <Tag tone="green">{staffCopy.import.web}</Tag>
              <Tag tone="blue">{staffCopy.import.nightly}</Tag>
              <Tag>{staffCopy.import.checkOnly}</Tag>
            </>
          }
          intro={
            <>
              {staffCopy.check.intro.before}
              <a href={MEMBERS_API} target="_blank" rel="noreferrer">
                {staffCopy.check.intro.link}
              </a>
              {staffCopy.check.intro.after}
            </>
          }
          actions={<JobActions action={checkNow} label={staffCopy.check.checkNow} job="check-mps" />}
        >
          <RunList runs={asList(check)} none={staffCopy.check.never} />
        </ImportCard>

        <ImportCard
          title={
            <>
              {staffCopy.controlAi.title} <Tag tone="green">{staffCopy.import.web}</Tag>
              <Tag tone="blue">{staffCopy.import.nightly}</Tag>
            </>
          }
          intro={
            <>
              {staffCopy.controlAi.intro.before}
              <a href={CONTROLAI_LETTER_PAGE} target="_blank" rel="noreferrer">
                {staffCopy.controlAi.intro.link}
              </a>
              {staffCopy.controlAi.intro.after}
            </>
          }
          actions={
            <JobActions action={importControlAiNow} label={staffCopy.controlAi.importNow} job="import-controlai" />
          }
        >
          <RunList runs={asList(controlAiImport)} none={staffCopy.controlAi.never} />
        </ImportCard>

        <ImportCard
          title={
            <>
              {staffCopy.import.title} <Tag tone="amber">{staffCopy.import.airtable}</Tag>
              <Tag>{staffCopy.import.oneOff}</Tag>
            </>
          }
          intro={
            <>
              {staffCopy.import.intro.before}
              <a href={PARLIAMENTARIANS_TABLE_URL} target="_blank" rel="noreferrer">
                {staffCopy.import.intro.link}
              </a>
              {staffCopy.import.intro.after}
            </>
          }
          actions={<JobActions action={importFromAirtable} label={staffCopy.import.button} job="import-signatories" />}
        >
          <RunList runs={asList(signatoryImport)} none={staffCopy.import.none} />
        </ImportCard>
      </ImportCards>
    </StaffPage>
  );
}
