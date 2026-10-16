import type { ReactNode } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { type ImportRun, NIGHTLY } from "@/lib/import-runs";
import ResultBox from "./ResultBox";
import styles from "./staff.module.css";

type Props = {
  run: ImportRun<unknown>;
  /** The job's own summary of what the run found. Not shown for a failed run, whose error is. */
  summary: ReactNode;
  lines?: number;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * One run from the import log, in a ResultBox: how it ended, when, who
 * started it, and what it found, or why it failed, on the line; the job's
 * detail folded under it.
 */
export default function RunBox({ run, summary, lines, actions, children }: Props) {
  const failed = run.status === "failed";
  const line = (
    <>
      <strong>{staffCopy.runs.status[run.status]}</strong>{" "}
      <span className={styles.muted}>{new Date(run.at).toLocaleString("en-GB")}</span>
      {run.startedBy && (
        <span className={styles.muted}>
          {" "}
          · {run.startedBy === NIGHTLY ? staffCopy.import.nightly : staffCopy.runs.by(run.startedBy)}
        </span>
      )}
      {run.decidedBy && <span className={styles.muted}> · {staffCopy.runs.decidedBy(run.decidedBy)}</span>}
      {failed ? <> · {run.error}</> : <span className={styles.muted}> · {summary}</span>}
    </>
  );
  return (
    <ResultBox error={failed} summary={line} lines={lines} actions={actions} aria-label={run.at}>
      {failed ? undefined : children}
    </ResultBox>
  );
}
