import Link from "next/link";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import type { AnyImportRun } from "@/lib/import-runs";
import { IMPORT_JOBS } from "@/lib/import-runs";
import {
  type Count,
  DASHBOARD_DAYS,
  DASHBOARD_SECTIONS,
  type Dashboard,
  type DashboardMetric,
  type DashboardSection,
  METRIC_LINKS,
  ranWell,
} from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import { staffTime } from "@/lib/staff-time";
import styles from "./StaffDashboard.module.css";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.home.dashboard;

/** How a run that didn't end well ended, as a coloured tag: red for failed, amber for held or stopped short, plain for never run. */
function Ending({ run }: { run: AnyImportRun | undefined }) {
  if (!run) return <Tag>{copy.neverRun}</Tag>;
  const tone: TagTone = run.status === "failed" ? "red" : "amber";
  const stoppedShort = run.job === "import-luma" && run.status !== "failed" && run.result.stoppedBy !== undefined;
  return (
    <>
      <Tag tone={tone}>{staffCopy.runs.status[run.status]}</Tag>
      {stoppedShort && <Tag tone="amber">{staffCopy.runs.incomplete}</Tag>}
    </>
  );
}

/** The week against the one before: up or down by how many, green when that's good and red when it's bad, or the same. */
function Change({ count, worse }: { count: Count; worse: boolean }) {
  const by = count.week - count.previous;
  if (by === 0) return <Muted>{copy.change.same}</Muted>;
  const good = by > 0 !== worse;
  return <span className={good ? styles.good : styles.bad}>{by > 0 ? copy.change.up(by) : copy.change.down(-by)}</span>;
}

/** One row of tiles: a number each, reading as "3 letters to MPs", the whole tile a link to its page where the person may see it. */
function Tiles({
  section,
  dashboard,
  permissions,
}: {
  section: DashboardSection;
  dashboard: Dashboard;
  permissions: readonly Permission[];
}) {
  const metrics: readonly DashboardMetric[] = DASHBOARD_SECTIONS[section];
  return (
    <>
      <h2 className={styles.heading}>{copy.sections[section]}</h2>
      <ul className={styles.tiles} aria-label={copy.sections[section]}>
        {metrics.map((metric) => {
          const { href, permission, worse } = METRIC_LINKS[metric];
          const count = dashboard.counts[metric];
          const inside = (
            <>
              <span className={styles.number}>{count.week}</span>
              <span className={styles.label}>{copy.metrics[metric](count.week)}</span>
              <Change count={count} worse={worse === true} />
            </>
          );
          return (
            <li key={metric}>
              {!permission || permissions.includes(permission) ? (
                <Link href={href} className={styles.tile}>
                  {inside}
                </Link>
              ) : (
                <div className={styles.tile}>{inside}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * The home page's dashboard: the last week's activity, then the operations
 * numbers, each tile against the week before; then the imports, in one
 * line when every job's newest run ended well, or else each that didn't,
 * with how it ended.
 */
export default function StaffDashboard({
  dashboard,
  permissions,
}: {
  dashboard: Dashboard;
  permissions: readonly Permission[];
}) {
  const wrong = IMPORT_JOBS.map((job, i) => [job, dashboard.imports[i]] as const).filter(([, run]) => !ranWell(run));
  return (
    <>
      <p className={styles.window}>{copy.title(DASHBOARD_DAYS)}</p>
      <Tiles section="activity" dashboard={dashboard} permissions={permissions} />
      <Tiles section="operations" dashboard={dashboard} permissions={permissions} />
      <h2 className={styles.heading}>{copy.importsTitle}</h2>
      {wrong.length === 0 ? (
        <p>
          <Tag tone="green">{staffCopy.runs.status.ok}</Tag> <Link href="/staff/import-data">{copy.allWell}</Link>
        </p>
      ) : (
        <ul className={styles.imports} aria-label={copy.importsTitle}>
          {wrong.map(([job, run]) => (
            <li key={job}>
              <Link href="/staff/import-data">{jobTitles[job]}</Link> <Ending run={run} />
              {run && <Muted> {staffTime(run.at)}</Muted>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
