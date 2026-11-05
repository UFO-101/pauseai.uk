import { Fragment } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun } from "@/lib/import-runs";
import { type LogEntry, runLog } from "@/lib/run-log";
import type { JobPress } from "@/lib/server/import-runs";
import { staffClock } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";
import RunRows from "./RunRows";
import { Muted } from "@/components/ui/Text";
import styles from "./RunList.module.css";

type Props = {
  /** Newest first. */
  runs: AnyImportRun[];
  /** What to say when there are none. */
  none: string;
  decide?: Decide;
  /** Whether they may see who mail that matched nothing is from. */
  people?: boolean;
  /** A press of the job that's still running. */
  press?: JobPress;
};

/** A stretch of runs in the words of `say`, its times oldest first. */
function stretch(runs: AnyImportRun[], say: (from: string, to: string, n: number) => string) {
  return say(staffClock(runs.at(-1)!.at), staffClock(runs[0].at), runs.length);
}

/** One entry of a job's log, as lib/run-log.ts lays it out. */
function Entry({ entry, decide, people }: { entry: LogEntry } & Pick<Props, "decide" | "people">) {
  const { shape, runs, tone, open, folded } = entry;
  if (shape === "quiet")
    return (
      <p>
        <Muted>{stretch(runs, staffCopy.runs.quiet)}</Muted>
      </p>
    );
  if (shape === "rows" && folded) {
    return (
      <details className={styles.stretch}>
        <summary>{stretch(runs, staffCopy.runs.stretch)}</summary>
        <RunRows runs={runs} />
      </details>
    );
  }
  if (shape === "rows") return <RunRows runs={runs} />;
  return (
    <div className={tone && styles[tone]}>
      <Run run={runs[0]} decide={decide} open={open} people={people} />
    </div>
  );
}

/**
 * Runs from the import log, under a heading for each day, or a line saying there
 * are none. The newest is the job's state now: tinted by how it ended, and
 * unfolded however long its detail. Further down, each is laid out by
 * lib/run-log.ts: whole, plain and folded when long, or for a job that runs
 * often, a row or a line. While a press runs, that's the state instead, so the
 * newest is treated as an older one.
 */
export default function RunList({ runs, none, decide, people, press }: Props) {
  if (runs.length === 0) return <p>{none}</p>;
  return runLog(runs, !!press).map((entry) => (
    <Fragment key={entry.runs[0].id}>
      {entry.day && <h2>{entry.day}</h2>}
      <Entry entry={entry} decide={decide} people={people} />
    </Fragment>
  ));
}
