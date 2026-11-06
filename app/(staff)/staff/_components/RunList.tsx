import { Fragment } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun } from "@/lib/import-runs";
import { type LogEntry, runLog, tabled } from "@/lib/run-log";
import type { JobPress } from "@/lib/server/import-runs";
import { staffClock } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";
import RunTable from "./RunTable";
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

/** A run shown whole, in its box, tinted by its tone. */
function Whole({ entry, decide, people }: { entry: LogEntry } & Pick<Props, "decide" | "people">) {
  const { runs, tone, open } = entry;
  return (
    <div className={tone && styles[tone]}>
      <Run run={runs[0]} decide={decide} open={open} people={people} />
    </div>
  );
}

/**
 * A day of a job that runs often: the job's state now, whole, if the day
 * has it, then the rest as one table. Rows too far down to show are folded,
 * a line each, and the table carries on under it, headed only the first time.
 */
function DayTable({ entries, decide, people }: { entries: LogEntry[] } & Pick<Props, "decide" | "people">) {
  const current = entries[0].current ? entries[0] : undefined;
  const segments: LogEntry[][] = [];
  for (const entry of current ? entries.slice(1) : entries) {
    const last = segments.at(-1);
    if (last && !entry.folded && !last[0].folded) last.push(entry);
    else segments.push([entry]);
  }
  const firstShown = segments.find((segment) => !segment[0].folded);
  return (
    <>
      {current && <Whole entry={current} decide={decide} people={people} />}
      {segments.map((segment) =>
        segment[0].folded ? (
          <details key={segment[0].runs[0].id} className={styles.stretch}>
            <summary>
              {staffCopy.runs.range(staffClock(segment[0].runs.at(-1)!.at), staffClock(segment[0].runs[0].at))}:{" "}
              {staffCopy.runs.stretch(segment[0].runs.length)}
            </summary>
            <RunTable entries={segment} header={false} decide={decide} people={people} />
          </details>
        ) : (
          <RunTable
            key={segment[0].runs[0].id}
            entries={segment}
            header={segment === firstShown}
            decide={decide}
            people={people}
          />
        ),
      )}
    </>
  );
}

/**
 * Runs from the import log, under a heading for each day, or a line saying there
 * are none. The newest is the job's state now: tinted by how it ended, and
 * unfolded however long its detail. Further down, each is laid out by
 * lib/run-log.ts: whole, plain and folded when long, or for a job that runs
 * often, a row of the day's table. While a press runs, that's the state instead, so the
 * newest is treated as an older one.
 */
export default function RunList({ runs, none, decide, people, press }: Props) {
  if (runs.length === 0) return <p>{none}</p>;
  const table = tabled(runs[0].job);
  return runLog(runs, !!press).map(({ day, entries }) => (
    <Fragment key={day}>
      <h2>{day}</h2>
      {table ? (
        <DayTable entries={entries} decide={decide} people={people} />
      ) : (
        entries.map((entry) => <Whole key={entry.runs[0].id} entry={entry} decide={decide} people={people} />)
      )}
    </Fragment>
  ));
}
