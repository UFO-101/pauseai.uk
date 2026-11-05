import { Fragment } from "react";
import { type AnyImportRun, runTone } from "@/lib/import-runs";
import type { JobPress } from "@/lib/server/import-runs";
import { staffDate } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";
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

/**
 * Runs from the import log, a box each under a heading for each day, or a
 * line saying there are none. The newest is the job's state now: tinted by
 * how it ended, and unfolded however long its detail. The older ones are
 * plain, folded when long. While a press runs, that's the state instead: the
 * newest is plain too, and a run it has saved so far waits until it finishes.
 */
export default function RunList({ runs: all, none, decide, people, press }: Props) {
  const runs = press ? all.filter((run) => new Date(run.at) < new Date(press.startedAt)) : all;
  if (runs.length === 0) return <p>{none}</p>;
  return runs.map((run, i) => {
    const day = staffDate(run.at);
    const tone = i === 0 && !press ? runTone(run) : undefined;
    return (
      <Fragment key={run.id}>
        {(i === 0 || staffDate(runs[i - 1].at) !== day) && <h2>{day}</h2>}
        <div className={tone && styles[tone]}>
          <Run run={run} decide={decide} open={i === 0} people={people} />
        </div>
      </Fragment>
    );
  });
}
