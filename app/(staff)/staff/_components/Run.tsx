import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  type AnyImportRun,
  type ControlAiImport,
  type LumaImport,
  type MembersImport,
  type EmailSync,
  type GoToParliamentImport,
  type MpCheck,
  type PoliticianSync,
  type WebFormImport,
} from "@/lib/import-runs";
import type { MpProblem } from "@/lib/mp-check";
import { changeCount, type Renamed, type SyncedPolitician } from "@/lib/politician-sync";
import RunBox from "./RunBox";
import { Muted } from "@/components/ui/Text";
import Table from "@/components/ui/Table";

/** The Server Action that applies or discards a held politician sync. */
export type Decide = (formData: FormData) => void | Promise<void>;

/**
 * Politicians a sync added, lost or changed, each by where they sit and
 * their name, in the order a person reads them. Runs from before every body was read have only MPs, without
 * a house.
 */
function Politicians({ heading, politicians }: { heading: string; politicians: Partial<SyncedPolitician>[] }) {
  if (politicians.length === 0) return null;
  const where = (p: Partial<SyncedPolitician>) => `${p.constituency ?? staffCopy.houses[p.house!]}: ${p.name}`;
  // In the order a person reads them, a number in a name as a number: Gone 2 before Gone 10.
  const sorted = [...politicians].sort((a, b) => where(a).localeCompare(where(b), "en-GB", { numeric: true }));
  return (
    <>
      <h4>
        {heading} ({politicians.length})
      </h4>
      <ul>
        {sorted.map((p) => (
          <li key={p.airtableId}>
            {where(p)}
            {p.email ? "" : ` (${staffCopy.politicians.noEmail})`}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The records whose names changed, from and to. */
function RenamedList({ renamed }: { renamed: Renamed[] }) {
  if (renamed.length === 0) return null;
  return (
    <>
      <h4>
        {staffCopy.syncs.renamed} ({renamed.length})
      </h4>
      <ul>
        {renamed.map((r) => (
          <li key={r.airtableId}>
            {r.from} → {r.to}
          </li>
        ))}
      </ul>
    </>
  );
}

/** One button, in a form of its own, so the decision travels as a field. */
function Decision({ id, decision, decide }: { id: number; decision: "apply" | "discard"; decide: Decide }) {
  return (
    <form action={decide}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <SubmitButton variant={decision === "apply" ? "primary" : "ghost"} size="small">
        {staffCopy.syncs[decision]}
      </SubmitButton>
    </form>
  );
}

/**
 * A copy of the politicians from Airtable: who was added, removed and
 * changed, whose names changed, and the statuses it set. A held one can be
 * applied or discarded, given `decide`.
 */
function SyncRun({ run, decide, open }: { run: PoliticianSync; decide?: Decide; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { added, removed, changed } = run.result.changes;
  const renamed = run.result.renamed ?? [];
  const count = changeCount(run.result.changes);
  return (
    <RunBox
      run={run}
      open={open}

      lines={count}
      summary={
        <>
          {staffCopy.syncs.added} {added.length}, {staffCopy.syncs.removed} {removed.length}, {staffCopy.syncs.changed}{" "}
          {changed.length}
          {run.result.statuses && <>. {staffCopy.syncs.statuses(run.result.statuses)}</>}
        </>
      }
      actions={
        run.status === "held" &&
        decide && (
          <>
            <Decision id={run.id} decision="apply" decide={decide} />
            <Decision id={run.id} decision="discard" decide={decide} />
          </>
        )
      }
    >
      {count > 0 && (
        <>
          <RenamedList renamed={renamed} />
          <Politicians heading={staffCopy.syncs.added} politicians={added} />
          <Politicians heading={staffCopy.syncs.removed} politicians={removed} />
          <Politicians heading={staffCopy.syncs.changed} politicians={changed} />
        </>
      )}
    </RunBox>
  );
}

/** What each side says, for one problem. */
function sides(problem: MpProblem): [string, string] {
  switch (problem.kind) {
    case "missing":
      return ["", problem.parliament];
    case "extra":
    case "unofficial":
      return [problem.airtable, ""];
    case "name":
      return [problem.airtable, problem.parliament];
    case "email":
      return [`${problem.name}: ${problem.airtable ?? staffCopy.check.noEmail}`, problem.parliament.join(", ")];
  }
}

/** A check of Airtable's MPs against Parliament's: where they disagree. */
function CheckRun({ run, open }: { run: MpCheck; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { problems } = run.result;
  const count = problems.length;
  return (
    <RunBox
      run={run}
      open={open}

      lines={count}
      summary={count === 0 ? staffCopy.check.allGood : staffCopy.check.problems(count)}
    >
      {count > 0 && (
        <Table>
          <thead>
            <tr>
              <th>{staffCopy.check.columns.constituency}</th>
              <th>{staffCopy.check.columns.problem}</th>
              <th>{staffCopy.check.columns.airtable}</th>
              <th>{staffCopy.check.columns.parliament}</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => {
              const [airtable, parliament] = sides(problem);
              return (
                <tr key={`${problem.constituency} ${problem.kind}`}>
                  <td>{problem.constituency}</td>
                  <td>{staffCopy.check.kinds[problem.kind]}</td>
                  <td>{airtable}</td>
                  <td>{parliament}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </RunBox>
  );
}

/** A copy of ControlAI's letter's signatories: what it did, and the names it couldn't place. */
function ControlAiRun({ run, open }: { run: ControlAiImport; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { result } = run;
  return (
    <RunBox run={run} summary={staffCopy.controlAi.result(result)} lines={result.problems.length} open={open}>
      {result.problems.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>{staffCopy.controlAi.columns.name}</th>
              <th>{staffCopy.controlAi.columns.problem}</th>
            </tr>
          </thead>
          <tbody>
            {result.problems.map((problem) => (
              <tr key={problem.name}>
                <td>{problem.name}</td>
                <td>
                  {staffCopy.controlAi.kinds[problem.kind]}
                  {problem.candidates.length > 0 && <Muted> {problem.candidates.join(", ")}</Muted>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </RunBox>
  );
}

/** A copy of PauseAI's emails from Airtable: the counts, and the emails held back for a mailing nobody has added. */
function EmailsRun({ run, open }: { run: EmailSync; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { unplaced } = run.result;
  return (
    <RunBox run={run} summary={staffCopy.pauseaiEmails.result(run.result)} lines={unplaced.length} open={open}>
      {unplaced.length > 0 && (
        <>
          <h4>
            {staffCopy.pauseaiEmails.unplaced} ({unplaced.length})
          </h4>
          <ul>
            {unplaced.map((email) => (
              <li key={email.airtableId}>
                {email.airtableId}: {email.mailings.join(", ") || staffCopy.pauseaiEmails.noBoxes}
              </li>
            ))}
          </ul>
        </>
      )}
    </RunBox>
  );
}

/** The one-off copy of pauseai.info's web form letters: the counts. */
function WebFormRun({ run, open }: { run: WebFormImport; open?: boolean }) {
  return (
    <RunBox run={run} summary={run.status === "failed" ? null : staffCopy.webForm.result(run.result)} open={open} />
  );
}

/** The one-off copy of Go to Parliament's meetings: the counts. */
function GoToParliamentRun({ run, open }: { run: GoToParliamentImport; open?: boolean }) {
  return (
    <RunBox
      run={run}
      summary={run.status === "failed" ? null : staffCopy.goToParliament.result(run.result)}
      open={open}
    />
  );
}

/** A copy of the Luma calendar: the counts, the places looked up, and why it stopped early if it did. */
function LumaRun({ run, open }: { run: LumaImport; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { stoppedBy, contactPages, places } = run.result;
  return (
    <RunBox
      run={run}
      open={open}
      summary={
        <>
          {staffCopy.luma.result(run.result)}
          {contactPages !== undefined && <> {staffCopy.luma.contactPages(contactPages)}</>}
          {places && <> {staffCopy.luma.places(places)}</>}
          {places?.failed && <> {staffCopy.luma.placesFailed}</>}
          {stoppedBy && <> {staffCopy.luma.stoppedBy[stoppedBy]}</>}
        </>
      }
    />
  );
}

/** A copy of the members: the counts. */
function MembersRun({ run, open }: { run: MembersImport; open?: boolean }) {
  return (
    <RunBox run={run} summary={run.status === "failed" ? null : staffCopy.members.result(run.result)} open={open} />
  );
}

/** One run from the import log, as its job's page shows it; `open` starts its detail unfolded, however long. */
export default function Run({ run, decide, open }: { run: AnyImportRun; decide?: Decide; open?: boolean }) {
  switch (run.job) {
    case "sync-politicians":
      return <SyncRun run={run} decide={decide} open={open} />;
    case "sync-emails":
      return <EmailsRun run={run} open={open} />;
    case "import-web-form-letters":
      return <WebFormRun run={run} open={open} />;
    case "import-go-to-parliament":
      return <GoToParliamentRun run={run} open={open} />;
    case "check-mps":
      return <CheckRun run={run} open={open} />;
    case "import-controlai":
      return <ControlAiRun run={run} open={open} />;
    case "import-luma":
      return <LumaRun run={run} open={open} />;
    case "import-members":
      return <MembersRun run={run} open={open} />;
  }
}
