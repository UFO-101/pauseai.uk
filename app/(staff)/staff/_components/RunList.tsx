import { Fragment } from "react";
import { jobTitles } from "@/lib/content/staff-interface";
import type { AnyImportRun } from "@/lib/import-runs";
import { staffDate } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";

type Props = {
  runs: AnyImportRun[];
  /** What to say when there are none. */
  none: string;
  decide?: Decide;
  /** The history page: name each run's job, and head each day's runs with its date. */
  history?: boolean;
};

/** Runs from the import log, a box each, or a line saying there are none. */
export default function RunList({ runs, none, decide, history }: Props) {
  if (runs.length === 0) return <p>{none}</p>;
  return runs.map((run, i) => {
    const day = staffDate(run.at);
    const newDay = history && (i === 0 || staffDate(runs[i - 1].at) !== day);
    return (
      <Fragment key={run.id}>
        {newDay && <h2>{day}</h2>}
        <Run run={run} decide={decide} label={history ? jobTitles[run.job] : undefined} />
      </Fragment>
    );
  });
}
