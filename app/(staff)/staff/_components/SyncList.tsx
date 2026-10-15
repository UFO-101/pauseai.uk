import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SyncedMp } from "@/lib/mps";
import type { MpSync } from "@/lib/server/mp-sync";
import styles from "./staff.module.css";

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

/** Recent copies of the MPs from Parliament. Held ones can be applied or discarded. */
export default function SyncList({
  syncs,
  decide,
}: {
  syncs: MpSync[];
  decide: (formData: FormData) => void | Promise<void>;
}) {
  if (syncs.length === 0) return <p>{staffCopy.syncs.none}</p>;
  return (
    <>
      {syncs.map((sync) => (
        <section key={sync.id} className={styles.sync} aria-label={`${sync.at}`}>
          <p>
            <strong>{staffCopy.syncs.status[sync.status]}</strong>{" "}
            <span className={styles.muted}>{new Date(sync.at).toLocaleString("en-GB")}</span>
            {sync.decidedBy && <span className={styles.muted}> · {staffCopy.syncs.decidedBy(sync.decidedBy)}</span>}
          </p>
          <Mps heading={staffCopy.syncs.added} mps={sync.changes.added} />
          <Mps heading={staffCopy.syncs.removed} mps={sync.changes.removed} />
          <Mps heading={staffCopy.syncs.changed} mps={sync.changes.changed} />
          {sync.status === "held" && (
            <div className={styles.actions}>
              <Decision id={sync.id} decision="apply" decide={decide} />
              <Decision id={sync.id} decision="discard" decide={decide} />
            </div>
          )}
        </section>
      ))}
    </>
  );
}
