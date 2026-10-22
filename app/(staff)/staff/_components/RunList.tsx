import { Fragment } from "react";
import type { AnyImportRun } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";

type Props = {
  /** Newest first. */
  runs: AnyImportRun[];
  /** What to say when there are none. */
  none: string;
  decide?: Decide;
};

/** Runs from the import log, a box each under a heading for each day, or a line saying there are none. */
export default function RunList({ runs, none, decide }: Props) {
  if (runs.length === 0) return <p>{none}</p>;
  return runs.map((run, i) => {
    const day = staffDate(run.at);
    return (
      <Fragment key={run.id}>
        {(i === 0 || staffDate(runs[i - 1].at) !== day) && <h2>{day}</h2>}
        <Run run={run} decide={decide} />
      </Fragment>
    );
  });
}
