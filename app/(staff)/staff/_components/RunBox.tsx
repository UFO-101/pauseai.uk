import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { type AnyImportRun, NIGHTLY, runStatus } from "@/lib/import-runs";
import { staffTime } from "@/lib/staff-time";
import ResultBox from "./ResultBox";
import { Muted } from "@/components/ui/Text";

type Props = {
  run: AnyImportRun;
  /** The job's own summary of what the run found. Not shown for a failed run, whose error is. */
  summary: ReactNode;
  lines?: number;
  /** Starts unfolded, however long its detail (ResultBox). */
  open?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * One run from the import log, in a ResultBox: how it ended, when, who
 * started it, and what it found, or why it failed, on the line; the job's
 * detail folded under it.
 */
export default function RunBox({ run, summary, lines, open, actions, children }: Props) {
  const failed = run.status === "failed";
  const line = (
    <>
      <strong>{staffCopy.runs.status[runStatus(run)]}</strong> <Muted>{staffTime(run.at)}</Muted>
      {run.startedBy && (
        <Muted> · {run.startedBy === NIGHTLY ? staffCopy.import.nightly : staffCopy.runs.by(run.startedBy)}</Muted>
      )}
      {run.decidedBy && <Muted> · {staffCopy.runs.decidedBy(run.decidedBy)}</Muted>}
      {failed ? <> · {run.error}</> : <Muted> · {summary}</Muted>}
    </>
  );
  return (
    <ResultBox summary={line} lines={lines} open={open} actions={actions} aria-label={run.at}>
      {failed ? undefined : children}
    </ResultBox>
  );
}
