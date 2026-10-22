import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { type AnyImportRun, NIGHTLY } from "@/lib/import-runs";
import { staffTime } from "@/lib/staff-time";
import ResultBox from "./ResultBox";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";

type Props = {
  run: AnyImportRun;
  /** The job's own summary of what the run found. Not shown for a failed run, whose error is. */
  summary: ReactNode;
  /** The run stopped before it finished: the box is amber, with a tag saying so. A failed run is red by itself. */
  incomplete?: boolean;
  lines?: number;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * One run from the import log, in a ResultBox: how it ended, when, who
 * started it, and what it found, or why it failed, on the line; the job's
 * detail folded under it.
 */
export default function RunBox({ run, summary, incomplete, lines, actions, children }: Props) {
  const failed = run.status === "failed";
  const status = staffCopy.runs.status[run.status];
  const line = (
    <>
      {failed ? <Tag tone="red">{status}</Tag> : <strong>{status}</strong>}
      {incomplete && (
        <>
          {" "}
          <Tag tone="amber">{staffCopy.runs.incomplete}</Tag>
        </>
      )}{" "}
      <Muted>{staffTime(run.at)}</Muted>
      {run.startedBy && (
        <Muted> · {run.startedBy === NIGHTLY ? staffCopy.import.nightly : staffCopy.runs.by(run.startedBy)}</Muted>
      )}
      {run.decidedBy && <Muted> · {staffCopy.runs.decidedBy(run.decidedBy)}</Muted>}
      {failed ? <> · {run.error}</> : <Muted> · {summary}</Muted>}
    </>
  );
  return (
    <ResultBox
      tone={failed ? "failed" : incomplete ? "incomplete" : undefined}
      summary={line}
      lines={lines}
      actions={actions}
      aria-label={run.at}
    >
      {failed ? undefined : children}
    </ResultBox>
  );
}
