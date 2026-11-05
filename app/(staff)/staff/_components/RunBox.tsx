import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { type AnyImportRun, JOB_SCHEDULES, NIGHTLY, runStatus } from "@/lib/import-runs";
import { staffTime } from "@/lib/staff-time";
import ResultBox from "./ResultBox";
import { Muted } from "@/components/ui/Text";
import styles from "./RunBox.module.css";

type Props = {
  run: AnyImportRun;
  /** The job's own summary of what the run found. Not shown for a failed run, whose error is. */
  summary: ReactNode;
  lines?: number;
  /** Whether it starts unfolded, whatever its detail's length; left out, it goes by `lines` (ResultBox). */
  open?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * One run from the import log, in a ResultBox: how it ended, when, who
 * started it, and what it found, or why it failed, on the line; what went
 * wrong along the way under it, never folded; the job's detail folded under
 * that.
 */
export default function RunBox({ run, summary, lines, open, actions, children }: Props) {
  const failed = run.status === "failed";
  const line = (
    <>
      <strong>{staffCopy.runs.status[runStatus(run)]}</strong> <Muted>{staffTime(run.at)}</Muted>
      {run.startedBy && (
        <Muted>
          {" "}
          · {run.startedBy === NIGHTLY ? staffCopy.import[JOB_SCHEDULES[run.job]] : staffCopy.runs.by(run.startedBy)}
        </Muted>
      )}
      {run.decidedBy && <Muted> · {staffCopy.runs.decidedBy(run.decidedBy)}</Muted>}
      {failed ? <> · {staffCopy.runs.error(run.error)}</> : <Muted> · {summary}</Muted>}
    </>
  );
  const problems = run.problems.length > 0 && (
    <ul className={styles.problems}>
      {run.problems.map((p, i) => (
        <li key={i}>
          {p.what}
          {p.error && <Muted> {p.error}</Muted>}
        </li>
      ))}
    </ul>
  );
  return (
    <ResultBox summary={line} lines={lines} open={open} problems={problems} actions={actions} aria-label={run.at}>
      {failed ? undefined : children}
    </ResultBox>
  );
}
