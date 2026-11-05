import { type AnyImportRun, JOB_SCHEDULES, runStatus, runTone } from "./import-runs";
import { staffDate } from "./staff-time";

// How a job's page lays out its runs. A job that runs every few minutes makes
// hundreds a day, nearly all alike, so what matters shows whole, the routine
// ones as rows of a table, and those that found nothing as a line.

/** How many runs, newest first, may start unfolded. Those further down start folded, however short. */
const UNFOLDED_RUNS = 5;

/** How many rows show before the rest are folded away. */
const RECENT_ROWS = 12;

/** A run shown whole, in a table's row, or as part of a line saying nothing happened. */
type Shape = "run" | "rows" | "quiet";

/** How a run shows when it isn't the newest. */
export function runShape(run: AnyImportRun): Shape {
  const schedule = JOB_SCHEDULES[run.job];
  if (schedule !== "frequent" && schedule !== "hourly") return "run";
  const status = runStatus(run);
  if (status === "unchanged") return "quiet";
  if (run.status === "failed") return "run";
  switch (run.job) {
    case "import-old-letters": {
      const { finished, stoppedBy, unmatched, unreadable, formTexts } = run.result;
      const notable = finished || stoppedBy || unmatched.length > 0 || unreadable.length > 0 || formTexts > 0;
      return notable ? "run" : "rows";
    }
    case "import-luma":
      return status === "incomplete" ? "run" : "rows";
    case "read-gmail":
      return status === "failed" || run.result.accounts.some((a) => a.restarted) ? "run" : "rows";
    default:
      return "run";
  }
}

/** One thing on a job's page: a run or several, under a heading if it's a new day. */
export type LogEntry = {
  shape: Shape;
  /** Newest first. */
  runs: AnyImportRun[];
  /** The day's heading, if it starts one. */
  day?: string;
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

/** A job's runs, newest first, laid out. While a press runs, that's the job's state, so the newest is treated as an older one. */
export function runLog(runs: AnyImportRun[], pressing: boolean): LogEntry[] {
  const entries: LogEntry[] = [];
  let whole = 0;
  let rows = 0;
  runs.forEach((run, i) => {
    const current = i === 0 && !pressing;
    const shape = current ? "run" : runShape(run);
    const previous = entries.at(-1);
    const day = staffDate(run.at);
    const sameDay = previous && staffDate(previous.runs[0].at) === day;
    const heading = sameDay ? {} : { day };
    if (shape === "run") {
      const tone = current ? runTone(run) : i === 0 ? undefined : problemTone(run);
      const open = current ? true : whole < UNFOLDED_RUNS ? undefined : false;
      whole++;
      entries.push({ shape, runs: [run], tone, open, ...heading });
      return;
    }
    const folded = shape === "rows" && rows >= RECENT_ROWS;
    if (shape === "rows") rows++;
    if (sameDay && previous.shape === shape && !!previous.folded === folded && previous.runs[0].job === run.job) {
      previous.runs.push(run);
    } else {
      entries.push({ shape, runs: [run], folded, ...heading });
    }
  });
  return entries;
}
