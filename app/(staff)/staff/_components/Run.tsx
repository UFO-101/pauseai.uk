import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import {
  type AnyImportRun,
  type ControlAiImport,
  type LumaImport,
  lumaRunIncomplete,
  type MembersImport,
  type MpCheck,
  type MpSync,
  type SignatoryImport,
} from "@/lib/import-runs";
import type { MpProblem } from "@/lib/mp-check";
import { changeCount, type SyncedMp } from "@/lib/mps";
import RunBox from "./RunBox";
import { Muted } from "@/components/ui/Text";
import Table from "@/components/ui/Table";

/** The Server Action that applies or discards a held MP sync. */
export type Decide = (formData: FormData) => void | Promise<void>;

function Mps({ heading, mps }: { heading: string; mps: SyncedMp[] }) {
  if (mps.length === 0) return null;
  return (
    <>
      <h4>
        {heading} ({mps.length})
      </h4>
      <ul>
        {mps.map((mp) => (
          <li key={mp.airtableId}>
            {mp.constituency}: {mp.name}
            {mp.email ? "" : ` (${staffCopy.politicians.noEmail})`}
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

/** A copy of the MPs from Airtable: who was added, removed and changed. A held one can be applied or discarded, given `decide`. */
function SyncRun({ run, decide, open }: { run: MpSync; decide?: Decide; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { added, removed, changed } = run.result.changes;
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
          <Mps heading={staffCopy.syncs.added} mps={added} />
          <Mps heading={staffCopy.syncs.removed} mps={removed} />
          <Mps heading={staffCopy.syncs.changed} mps={changed} />
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

/** A copy of the signatories from Airtable: the counts. */
function SignatoryRun({ run, open }: { run: SignatoryImport; open?: boolean }) {
  return (
    <RunBox run={run} summary={run.status === "failed" ? null : staffCopy.import.result(run.result)} open={open} />
  );
}

/** A copy of the Luma calendar: the counts, why it stopped early if it did, and whether the contacts are still being read. */
function LumaRun({ run, open }: { run: LumaImport; open?: boolean }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} open={open} />;
  const { stoppedBy, contactPages, contactsPassGoing } = run.result;
  return (
    <RunBox
      run={run}
      open={open}
      incomplete={lumaRunIncomplete(run.result)}
      summary={
        <>
          {staffCopy.luma.result(run.result)}
          {contactPages !== undefined && <> {staffCopy.luma.contactPages(contactPages)}</>}
          {stoppedBy && <> {staffCopy.luma.stoppedBy[stoppedBy]}</>}
          {contactsPassGoing && <> {staffCopy.luma.contactsPassGoing}</>}
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
    case "sync-mps":
      return <SyncRun run={run} decide={decide} open={open} />;
    case "check-mps":
      return <CheckRun run={run} open={open} />;
    case "import-controlai":
      return <ControlAiRun run={run} open={open} />;
    case "import-signatories":
      return <SignatoryRun run={run} open={open} />;
    case "import-luma":
      return <LumaRun run={run} open={open} />;
    case "import-members":
      return <MembersRun run={run} open={open} />;
  }
}
