import { Fragment } from "react";
import { type AnyImportRun, runTone } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";
import styles from "./RunList.module.css";

type Props = {
  /** Newest first. */
  runs: AnyImportRun[];
  /** What to say when there are none. */
  none: string;
  decide?: Decide;
};

/**
 * Runs from the import log, a box each under a heading for each day, or a
 * line saying there are none. The newest is the job's state now: tinted by
 * how it ended, and unfolded however long its detail. The older ones are
 * plain, folded when long.
 */
export default function RunList({ runs, none, decide }: Props) {
  if (runs.length === 0) return <p>{none}</p>;
  return runs.map((run, i) => {
    const day = staffDate(run.at);
    const tone = i === 0 ? runTone(run) : undefined;
    return (
      <Fragment key={run.id}>
        {(i === 0 || staffDate(runs[i - 1].at) !== day) && <h2>{day}</h2>}
        <div className={tone && styles[tone]}>
          <Run run={run} decide={decide} open={i === 0} />
        </div>
      </Fragment>
    );
  });
}
