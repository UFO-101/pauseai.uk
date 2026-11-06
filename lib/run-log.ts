import { type AnyImportRun, type ImportJob, JOB_SCHEDULES, runStatus, runTone } from "./import-runs";
import { staffDate } from "./staff-time";

// How a job's page lays out its runs. A job that runs every few minutes makes
// hundreds a day, nearly all alike, so each day is one table: the newest run
// a tinted row, the routine ones a row each, those that found nothing
// gathered into a row, and a problem a tinted row.

/** How many runs, newest first, may start unfolded. Those further down start folded, however short. */
const UNFOLDED_RUNS = 5;

/** How many rows show before the rest are folded away. */
const RECENT_ROWS = 12;

/** A run shown whole, in a table's row, or as part of a line saying nothing happened. */
type Shape = "run" | "rows" | "quiet";

/** Whether a job's page lays its history out as a table of the day's runs: the jobs that run every 5 minutes or hourly. */
export function tabled(job: ImportJob): boolean {
  const schedule = JOB_SCHEDULES[job];
  return schedule === "frequent" || schedule === "hourly";
}

/** How a run shows when it isn't the newest. */
export function runShape(run: AnyImportRun): Shape {
  const schedule = JOB_SCHEDULES[run.job];
  if (schedule !== "frequent" && schedule !== "hourly") return "run";
  const status = runStatus(run);
  if (status === "unchanged") return "quiet";
  if (run.status === "failed" || run.problems.length > 0) return "run";
  switch (run.job) {
    case "import-old-letters": {
      const { finished, stoppedBy, unmatched, unreadable, formTexts } = run.result;
      const notable = finished || stoppedBy || unmatched.length > 0 || unreadable.length > 0 || formTexts > 0;
      return notable ? "run" : "rows";
    }
    case "import-luma":
      return status === "incomplete" ? "run" : "rows";
    case "read-gmail":
      return run.result.accounts.some((a) => a.restarted) ? "run" : "rows";
    default:
      return "run";
  }
}

/** One thing on a job's page: a run or several. */
export type LogEntry = {
  shape: Shape;
  /** Newest first. */
  runs: AnyImportRun[];
  /** The job's state now: the newest run, with no press running. */
  current?: boolean;
  /** The tint of a run shown whole: how it ended, for the newest, or a problem. */
  tone?: "green" | "amber" | "red";
  /** Whether a run shown whole starts unfolded; left out, its length says. */
  open?: boolean;
  /** Rows too far down to show unfolded. */
  folded?: boolean;
};

/** Whether a problem stays tinted further down: on a job that runs so often it would be lost. */
function problemTone(run: AnyImportRun): LogEntry["tone"] {
  const tone = runTone(run);
  return runShape(run) === "run" && JOB_SCHEDULES[run.job] === "frequent" && tone !== "green" ? tone : undefined;
}

/** A day of a job's page: its heading, and what's under it, newest first. */
export type LogDay = { day: string; entries: LogEntry[] };

/** A job's runs, newest first, laid out by day. While a press runs, that's the job's state, so the newest is treated as an older one. */
export function runLog(runs: AnyImportRun[], pressing: boolean): LogDay[] {
  const days: LogDay[] = [];
  let whole = 0;
  let rows = 0;
  runs.forEach((run, i) => {
    const current = i === 0 && !pressing;
    const shape = current ? "run" : runShape(run);
    const day = staffDate(run.at);
    if (days.at(-1)?.day !== day) days.push({ day, entries: [] });
    const { entries } = days.at(-1)!;
    const previous = entries.at(-1);
    if (shape === "run") {
      const tone = current ? runTone(run) : i === 0 ? undefined : problemTone(run);
      const open = current ? true : whole < UNFOLDED_RUNS ? undefined : false;
      whole++;
      entries.push({ shape, runs: [run], tone, open, ...(current && { current }) });
      return;
    }
    const folded = shape === "rows" && rows >= RECENT_ROWS;
    if (shape === "rows") rows++;
    if (previous && previous.shape === shape && !!previous.folded === folded && previous.runs[0].job === run.job) {
      previous.runs.push(run);
    } else {
      entries.push({ shape, runs: [run], folded });
    }
  });
  return days;
}
