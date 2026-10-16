import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { changeCount, type SyncedMp } from "@/lib/mps";
import type { MpSync } from "@/lib/server/mp-sync";
import RunBox from "./RunBox";

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
function Decision({
  id,
  decision,
  decide,
}: {
  id: number;
  decision: "apply" | "discard";
  decide: (formData: FormData) => void | Promise<void>;
}) {
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

function Sync({ run, decide }: { run: MpSync; decide: (formData: FormData) => void | Promise<void> }) {
  if (run.status === "failed") return <RunBox run={run} summary={null} />;
  const { added, removed, changed } = run.result.changes;
  const count = changeCount(run.result.changes);
  return (
    <RunBox
      run={run}
      lines={count}
      summary={
        <>
          {staffCopy.syncs.added} {added.length}, {staffCopy.syncs.removed} {removed.length}, {staffCopy.syncs.changed}{" "}
          {changed.length}
        </>
      }
      actions={
        run.status === "held" && (
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

/** Recent copies of the MPs from Airtable, a box each, failures included. Held ones can be applied or discarded. */
export default function SyncList({
  runs,
  decide,
}: {
  runs: MpSync[];
  decide: (formData: FormData) => void | Promise<void>;
}) {
  if (runs.length === 0) return <p>{staffCopy.syncs.none}</p>;
  return runs.map((run) => <Sync key={run.id} run={run} decide={decide} />);
}
