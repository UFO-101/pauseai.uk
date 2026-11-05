import { staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun, GmailReading, LumaImport, OldLettersImport } from "@/lib/import-runs";
import { staffClock } from "@/lib/staff-time";
import Table from "@/components/ui/Table";

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
const GMAIL: Column<GmailReading>[] = [{ heading: staffCopy.gmailReading.found, cell: gmailFound }];

/** The columns of a job's table: the jobs with routine runs (lib/run-log.ts). */
function columnsOf(job: AnyImportRun["job"]): Column<never>[] {
  if (job === "import-old-letters") return OLD_LETTERS as Column<never>[];
  return (job === "import-luma" ? LUMA : GMAIL) as Column<never>[];
}

/** A job's routine runs, a row each, so the same number sits in the same place. All one job's. */
export default function RunRows({ runs }: { runs: AnyImportRun[] }) {
  const columns = columnsOf(runs[0].job) as Column<AnyImportRun>[];
  return (
    <Table>
      <thead>
        <tr>
          <th>{staffCopy.runs.time}</th>
          {columns.map(({ heading }) => (
            <th key={heading}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <td>{staffClock(run.at)}</td>
            {columns.map(({ heading, cell }) => (
              <td key={heading}>{cell(run)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
