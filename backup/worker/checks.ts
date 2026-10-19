import type { DumpReport, TimestampColumns } from "../container/backup.ts";

// What a good backup looks like, checked after every run against what the
// dump holds and against the backup before it.

export interface TableRule {
  /** The column whose latest value is the table's newest row. */
  timestamp?: string;
  /** The newest row must be at most this old when the backup is taken. */
  newWithinHours?: number;
  /** Rows are only ever added, so fewer than last time means data was lost. */
  neverShrinks?: boolean;
  minRows?: number;
}

export const RULES: Record<string, TableRule> = {
  // The nightly MP sync records a run every night, even when nothing
  // changed, so a backup without last night's run is missing data.
  import_runs: { timestamp: "at", newWithinHours: 36, neverShrinks: true },
  letters: { timestamp: "created_at", neverShrinks: true },
  letter_events: { timestamp: "at", neverShrinks: true },
  audit_log: { timestamp: "at", neverShrinks: true },
  // The House of Commons has 650 seats.
  politicians: { minRows: 600 },
};

/** A dump shrinking by more than this fraction since the last backup is a problem. */
const MAX_SHRINK = 0.2;

/** The record kept beside each dump. */
export interface Manifest extends DumpReport {
  /** When the backup was taken, as an ISO timestamp. */
  at: string;
  /** The dump's key in the bucket. */
  key: string;
}

/** Each rule's timestamp column, for the container to find the newest rows. */
export function timestampColumns(rules: Record<string, TableRule>): TimestampColumns {
  const columns: TimestampColumns = {};
  for (const [table, rule] of Object.entries(rules)) if (rule.timestamp) columns[table] = rule.timestamp;
  return columns;
}

/** What's wrong with this backup, one line each. Empty if nothing is. */
export function problems(
  manifest: Manifest,
  previous: Manifest | undefined,
  rules: Record<string, TableRule>,
): string[] {
  const found: string[] = [];
  const since = previous ? ` in the backup of ${previous.at}` : "";
  if (previous && manifest.bytes < previous.bytes * (1 - MAX_SHRINK)) {
    const percent = Math.round((1 - manifest.bytes / previous.bytes) * 100);
    found.push(`The dump is ${percent}% smaller than${since}: ${manifest.bytes} bytes, down from ${previous.bytes}.`);
  }
  for (const [table, rule] of Object.entries(rules)) {
    const stats = manifest.tables[table];
    if (!stats) {
      found.push(`${table}: not in the backup.`);
      continue;
    }
    if (rule.minRows !== undefined && stats.rows < rule.minRows) {
      found.push(`${table}: ${stats.rows} rows, fewer than the ${rule.minRows} expected.`);
    }
    const before = previous?.tables[table];
    if (rule.neverShrinks && before && stats.rows < before.rows) {
      found.push(`${table}: ${stats.rows} rows, down from ${before.rows}${since}.`);
    }
    if (rule.newWithinHours !== undefined) {
      const newest = stats.newest ? new Date(stats.newest) : undefined;
      const hours = newest ? (Date.parse(manifest.at) - newest.getTime()) / 3_600_000 : Infinity;
      if (hours > rule.newWithinHours) {
        const when = newest ? `is from ${newest.toISOString()}` : "doesn't exist";
        found.push(
          `${table}: the newest row ${when}, but should be within ${rule.newWithinHours} hours of the backup.`,
        );
      }
    }
  }
  return found;
}
