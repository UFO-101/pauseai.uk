import { Fragment } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun, GmailReading, ImportJob, LumaImport, OldLettersImport } from "@/lib/import-runs";
import type { LogEntry } from "@/lib/run-log";
import { staffClock } from "@/lib/staff-time";
import Run, { type Decide } from "./Run";
import { Muted } from "@/components/ui/Text";
import Table from "@/components/ui/Table";
import styles from "./RunTable.module.css";

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, n) => total + n, 0);

/** What a run's table has: a heading and a cell for each column. */
type Column<Run> = { heading: string; cell: (run: Run) => string | number };

const lettersWords = staffCopy.oldLetters.columns;
const OLD_LETTERS: Column<OldLettersImport>[] = [
  { heading: lettersWords.read, cell: (run) => run.result.read },
  { heading: lettersWords.left, cell: (run) => run.result.left },
  { heading: lettersWords.joined, cell: (run) => sum(run.result.joined) + sum(run.result.added) },
  { heading: lettersWords.replies, cell: (run) => run.result.replies },
  { heading: lettersWords.autoReplies, cell: (run) => run.result.autoReplies },
  { heading: lettersWords.oneOffs, cell: (run) => run.result.oneOffs },
];

const lumaWords = staffCopy.luma.columns;
const LUMA: Column<LumaImport>[] = [
  { heading: lumaWords.events, cell: (run) => run.result.events },
  { heading: lumaWords.guests, cell: (run) => run.result.guestsChanged },
  { heading: lumaWords.hosts, cell: (run) => run.result.hostsChanged ?? 0 },
  { heading: lumaWords.people, cell: (run) => run.result.people },
  { heading: lumaWords.contacts, cell: (run) => run.result.contacts },
  { heading: lumaWords.supporters, cell: (run) => run.result.supportersAdded },
];

/** The accounts of a read of Gmail that had anything, each in the words of its own line. */
function gmailFound(run: GmailReading): string {
  return run.result.accounts
    .filter((a) => a.replies + a.autoReplies + a.bounces + (a.oneOffs ?? 0) + (a.relayed ?? 0) + (a.spam ?? 0) > 0)
    .map((a) => {
      const inbox =
        a.relayed === undefined
          ? ""
          : ` ${staffCopy.lettersInbox.result({ relayed: a.relayed, spam: a.spam!, uncertain: a.uncertain! })}`;
      const oneOffs = a.oneOffs ? ` ${staffCopy.gmailReading.oneOffs(a.oneOffs)}` : "";
      return `${staffCopy.gmailReading.account(a)}${inbox}${oneOffs}`;
    })
    .join(" ");
}
const GMAIL: Column<GmailReading>[] = [{ heading: staffCopy.runs.found, cell: gmailFound }];

/** The columns of a job's table: the jobs with routine runs (lib/run-log.ts) have their counts; the rest have none, and a run's own words span the table. */
function columnsOf(job: ImportJob): Column<never>[] {
  switch (job) {
    case "import-old-letters":
      return OLD_LETTERS as Column<never>[];
    case "import-luma":
      return LUMA as Column<never>[];
    case "read-gmail":
      return GMAIL as Column<never>[];
    default:
      return [];
  }
}

type Props = {
  /** Each a row or several, newest first, all one job's. */
  entries: LogEntry[];
  /** Whether the columns are headed: a day's first table is, the rest line up under it. */
  header: boolean;
  decide?: Decide;
  /** Whether they may see who mail that matched nothing is from. */
  people?: boolean;
};

/** The rows of one entry: a run shown whole, a row per routine run, or one row for a stretch that found nothing. */
function Rows({
  entry,
  columns,
  span,
  decide,
  people,
}: { entry: LogEntry; columns: Column<AnyImportRun>[]; span: number } & Pick<Props, "decide" | "people">) {
  const { shape, runs, tone, open } = entry;
  if (shape === "quiet")
    return (
      <tr className={styles.quiet}>
        <td className={styles.time}>{staffCopy.runs.range(staffClock(runs.at(-1)!.at), staffClock(runs[0].at))}</td>
        <td colSpan={span}>
          <Muted>{staffCopy.runs.quiet(runs.length)}</Muted>
        </td>
      </tr>
    );
  const cells = (run: AnyImportRun) =>
    columns.map(({ heading, cell }) => (
      <td key={heading} className={styles.count}>
        {cell(run)}
      </td>
    ));
  if (shape === "rows")
    return runs.map((run) => (
      <tr key={run.id}>
        <td className={styles.time}>{staffClock(run.at)}</td>
        {cells(run)}
      </tr>
    ));
  // A run shown whole: its counts in their columns where it has them, and its
  // words under them, spanning the table; or just its words, for a failure or
  // a job without counts. A problem keeps its tint (lib/run-log.ts).
  const run = runs[0];
  const tinted = tone ? styles[tone] : "";
  const words = <Run run={run} decide={decide} open={open} people={people} bare />;
  if (columns.length > 0 && run.status !== "failed")
    return (
      <>
        <tr className={`${styles.lead} ${tinted}`}>
          <td className={styles.time}>{staffClock(run.at)}</td>
          {cells(run)}
        </tr>
        <tr className={tinted}>
          <td />
          <td colSpan={span}>{words}</td>
        </tr>
      </>
    );
  return (
    <tr className={tinted}>
      <td className={styles.time}>{staffClock(run.at)}</td>
      <td colSpan={span}>{words}</td>
    </tr>
  );
}

/**
 * A day's history on the page of a job that runs often: one table, a row or
 * several for each entry of the log (lib/run-log.ts), so the same number
 * sits in the same place. The time first, then the job's counts, or what
 * each run found.
 */
export default function RunTable({ entries, header, decide, people }: Props) {
  const columns = columnsOf(entries[0].runs[0].job) as Column<AnyImportRun>[];
  const headings = columns.length > 0 ? columns.map((c) => c.heading) : [staffCopy.runs.found];
  return (
    <div className={columns.length > 1 ? styles.wide : undefined}>
      <Table layout="fixed">
        {header && (
          <thead>
            <tr>
              <th className={styles.time}>{staffCopy.runs.time}</th>
              {headings.map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {entries.map((entry) => (
            <Fragment key={entry.runs[0].id}>
              <Rows entry={entry} columns={columns} span={headings.length} decide={decide} people={people} />
            </Fragment>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
