import Link from "next/link";
import { campaigns } from "@/lib/content/email-your-mp";
import { importPath } from "@/lib/import-runs";
import { jobTitles, staffCopy } from "@/lib/content/staff-interface";
import {
  type CampaignMetric,
  type Count,
  DASHBOARD_SECTIONS,
  DASHBOARD_WINDOWS,
  type Dashboard,
  type DashboardAction,
  type DashboardMetric,
  type DashboardSection,
  type DashboardWindow,
  isCampaignMetric,
  isSeriesMetric,
  METRIC_LINKS,
  type SeriesMetric,
} from "@/lib/staff-dashboard";
import type { Permission } from "@/lib/staff-permissions";
import { staffDate, staffDay, staffTime } from "@/lib/staff-time";
import AlertIcon from "./AlertIcon";
import Sparkline from "./Sparkline";
import styles from "./StaffDashboard.module.css";
import { ButtonLink } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.home.dashboard;

/** One thing waiting for a person, as an alert of its own: tinted amber while it waits, red when something's broken, with its icon, what it is, its detail, and its button. */
function Action({ action }: { action: DashboardAction }) {
  const words = copy.actions;
  const [tone, title, detail, button, href] =
    action.kind === "held-sync"
      ? [
          "amber" as const,
          words.heldSync,
          words.heldSyncDetail(action.added + action.removed + action.changed),
          words.decide,
          importPath("sync-mps"),
        ]
      : action.kind === "blocked-mp"
        ? [
            "red" as const,
            words.blockedMp(action.name),
            words.blockedMpDetail(staffDate(action.at)),
            words.openMp,
            `/staff/politicians/${action.politicianId}`,
          ]
        : [
            "red" as const,
            words.failedImport(jobTitles[action.job]),
            words.failedImportDetail(action.error, staffTime(action.at)),
            words.seeRun,
            importPath(action.job),
          ];
  return (
    <li className={`${styles.action} ${styles[tone]}`}>
      <AlertIcon tone={tone} />
      <span className={styles.what}>
        <span>{title}</span>
        <Muted>{detail}</Muted>
      </span>
      <ButtonLink href={href} variant={action.kind === "held-sync" ? "primary" : "ghost"} size="small" fit>
        {button}
      </ButtonLink>
    </li>
  );
}

/** The window against the one before: up or down by how many, green when that's good and red when it's bad, or the same. */
function Change({ count, worse, days }: { count: Count; worse: boolean; days: DashboardWindow }) {
  const by = count.current - count.previous;
  if (by === 0) return <Muted>{copy.change.same(days)}</Muted>;
  const good = by > 0 !== worse;
  return (
    <span className={good ? styles.good : styles.bad}>
      {by > 0 ? copy.change.up(by, days) : copy.change.down(-by, days)}
    </span>
  );
}

/** A bar split by campaign under a number, with each campaign's share in the legend. Nothing when the number is nothing. */
function CampaignBar({ counts }: { counts: Record<string, number> }) {
  const parts = campaigns.filter((campaign) => counts[campaign.slug] > 0);
  if (parts.length === 0) return null;
  return (
    <>
      <span className={styles.bar} aria-hidden="true">
        {parts.map((campaign, i) => (
          <span
            key={campaign.slug}
            className={styles.segment}
            data-campaign={i}
            style={{ flexGrow: counts[campaign.slug] }}
          />
        ))}
      </span>
      <span className={styles.legend}>
        {parts.map((campaign, i) => (
          <span key={campaign.slug}>
            <span className={styles.swatch} data-campaign={i} aria-hidden="true" /> {campaign.title} ·{" "}
            {counts[campaign.slug]}
          </span>
        ))}
      </span>
    </>
  );
}

/** A tile: the window's number, what it counts, a bar or a line where the metric has one, and how it moved. The whole tile is a link to its page, where the person may see it. */
function Tile({
  metric,
  dashboard,
  permissions,
}: {
  metric: DashboardMetric;
  dashboard: Dashboard;
  permissions: readonly Permission[];
}) {
  const { href, permission, worse } = METRIC_LINKS[metric];
  const count = dashboard.counts[metric];
  const label = copy.metrics[metric](count.current);
  const inside = (
    <>
      <span className={styles.number}>
        {count.current === 0 ? copy.none : count.current}
        {metric === "lettersSent" && dashboard.testLetters > 0 && (
          <span className={styles.test}>{copy.testLetters(dashboard.testLetters)}</span>
        )}
      </span>
      <span className={styles.label}>{label}</span>
      {isCampaignMetric(metric) && <CampaignBar counts={dashboard.byCampaign[metric as CampaignMetric]} />}
      {isSeriesMetric(metric) && (
        <Sparkline
          name={copy.series(label)}
          values={dashboard.series[metric as SeriesMetric].map((point) => point.count)}
          labels={dashboard.series[metric as SeriesMetric].map((point) =>
            copy.seriesPoint(dashboard.days, staffDate(point.from), point.count),
          )}
        />
      )}
      <Change count={count} worse={worse === true} days={dashboard.days} />
    </>
  );
  const linked = href !== undefined && (!permission || permissions.includes(permission));
  return (
    <li className={isCampaignMetric(metric) ? styles.wide : undefined}>
      {linked ? (
        <Link href={href} className={styles.tile}>
          {inside}
        </Link>
      ) : (
        <div className={styles.tile}>{inside}</div>
      )}
    </li>
  );
}

/** One group of tiles under its heading. */
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
        {metrics.map((metric) => (
          <Tile key={metric} metric={metric} dashboard={dashboard} permissions={permissions} />
        ))}
      </ul>
    </>
  );
}

/**
 * The home page's dashboard: what needs a person, an alert for each
 * thing, only when something does; the day and the window, with the other windows as links; the
 * window's numbers in three groups, each against the window before.
 */
export default function StaffDashboard({
  dashboard,
  permissions,
}: {
  dashboard: Dashboard;
  permissions: readonly Permission[];
}) {
  return (
    <>
      {dashboard.actions.length > 0 && (
        <section className={styles.actions} aria-labelledby="actions-title">
          <h2 id="actions-title" className={styles.actionsLabel}>
            {copy.actionsTitle}
          </h2>
          <ul aria-label={copy.actionsTitle}>
            {dashboard.actions.map((action, i) => (
              <Action key={i} action={action} />
            ))}
          </ul>
        </section>
      )}
      <p className={styles.window}>
        <strong>{staffDay(dashboard.asOf)}</strong>
        <span className={styles.windows}>
          <Muted>{copy.windows}</Muted>
          {DASHBOARD_WINDOWS.map((days) =>
            days === dashboard.days ? (
              <strong key={days} aria-current="true">
                {copy.window(days)}
              </strong>
            ) : (
              <Link key={days} href={days === DASHBOARD_WINDOWS[0] ? "/staff" : `/staff?days=${days}`}>
                {copy.window(days)}
              </Link>
            ),
          )}
        </span>
      </p>
      {(Object.keys(DASHBOARD_SECTIONS) as DashboardSection[]).map((section) => (
        <Tiles key={section} section={section} dashboard={dashboard} permissions={permissions} />
      ))}
    </>
  );
}
