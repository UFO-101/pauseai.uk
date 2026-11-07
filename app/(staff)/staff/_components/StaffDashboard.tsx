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
  SERIES_POINTS,
  agreedHref,
} from "@/lib/staff-dashboard";
import { SUPPORTER_SOURCES } from "@/lib/supporters";
import type { Permission } from "@/lib/staff-permissions";
import { staffDate, staffTime } from "@/lib/staff-time";
import Grid, { spanClass } from "./ui/Grid";
import Strip from "./ui/Strip";
import Tabs from "./ui/Tabs";
import Sparkline from "./Sparkline";
import StackedBars from "./StackedBars";
import TestTag from "./TestTag";
import styles from "./StaffDashboard.module.css";
import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import StaffLink from "./ui/StaffLink";

const copy = staffCopy.home.dashboard;

/** One thing waiting for a person, as a strip: amber waiting for a decision, red broken; what it is, its detail, and its button. */
function Action({ action }: { action: DashboardAction }) {
  const words = copy.actions;
  const [title, detail, button, href] =
    action.kind === "held-sync"
      ? [
          words.heldSync(action.added + action.removed + action.changed),
          words.heldSyncDetail,
          words.decide,
          importPath("sync-politicians"),
        ]
      : action.kind === "blocked-mp"
        ? [
            <>
              {words.blockedMp(action.name)}
              <TestTag isTest={action.isTest} />
            </>,
            words.blockedMpDetail,
            words.openMp,
            `/staff/politicians/${action.politicianId}`,
          ]
        : action.kind === "letters-inbox"
          ? [
              staffCopy.lettersInbox.alert.subject(action.count, action.inbox),
              words.lettersInboxDetail(staffTime(action.at)),
              words.lettersInboxButton,
              importPath("read-gmail"),
            ]
          : [
              words.failedImport(jobTitles[action.job]),
              words.failedImportDetail(action.error, staffTime(action.at)),
              words.seeRun,
              importPath(action.job),
            ];
  return (
    <li>
      <Strip
        tone={action.kind === "held-sync" ? "amber" : "red"}
        action={
          <StaffLink className={buttonClass({ variant: "primary", size: "small", fit: true })} href={href}>
            {button}
          </StaffLink>
        }
      >
        <span>{title}</span>
        <span>{detail}</span>
      </Strip>
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

/** A bar split by campaign under a number, with each campaign's share in the legend. Only for a number some campaign counted. */
function CampaignBar({ counts }: { counts: Record<string, number> }) {
  const parts = campaigns.filter((campaign) => counts[campaign.slug] > 0);
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

/** New supporters in bars by the window, each counted once and split by their earliest source. */
function SourceBars({ dashboard, label }: { dashboard: Dashboard; label: string }) {
  const sources = staffCopy.supporters.sources;
  const points = dashboard.supportersBySource;
  return (
    <StackedBars
      name={copy.bySourceName(label, dashboard.days, SERIES_POINTS)}
      parts={SUPPORTER_SOURCES.map((key) => ({ key, label: sources[key] }))}
      bars={points.map((point) => ({
        counts: point.sources,
        title: copy.seriesPoint(dashboard.days, staffDate(point.from), point.count),
      }))}
      from={staffDate(points[0].from)}
      to={staffDate(dashboard.asOf)}
    />
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
  const { permissions: needed, worse } = METRIC_LINKS[metric];
  const href = metric === "politiciansAgreed" ? agreedHref(dashboard) : METRIC_LINKS[metric].href(dashboard.days);
  const count = dashboard.counts[metric];
  const label = copy.metrics[metric](count.current);
  // A bar only when some campaign counted, a line or bars by source only when some window counted; the tile is a third, not a sixth, only to fit one, and half for the bars by source.
  const bar = isCampaignMetric(metric) && Object.values(dashboard.byCampaign[metric]).some((n) => n > 0);
  const series = isSeriesMetric(metric) ? dashboard.series[metric] : [];
  const line = series.some((point) => point.count > 0);
  const bySource = metric === "supportersAdded" && dashboard.supportersBySource.some((point) => point.count > 0);
  const inside = (
    <>
      <span className={styles.number}>{count.current === 0 ? copy.none : count.current}</span>
      <span className={styles.label}>{label}</span>
      {bar && <CampaignBar counts={dashboard.byCampaign[metric as CampaignMetric]} />}
      {line && (
        <Sparkline
          name={copy.series(label, dashboard.days, SERIES_POINTS)}
          values={series.map((point) => point.count)}
          labels={series.map((point) => copy.seriesPoint(dashboard.days, staffDate(point.from), point.count))}
          from={staffDate(series[0].from)}
          to={staffDate(dashboard.asOf)}
        />
      )}
      {bySource && <SourceBars dashboard={dashboard} label={label} />}
      <Change count={count} worse={worse === true} days={dashboard.days} />
    </>
  );
  const linked = needed.every((permission) => permissions.includes(permission));
  return (
    <li className={spanClass(bySource ? 3 : bar || line ? 2 : 1)}>
      {linked ? (
        <StaffLink href={href} className={styles.tile}>
          {inside}
        </StaffLink>
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
      <h2 className={styles.heading}>{staffCopy.nav.sections[section]}</h2>
      <Grid as="ul" label={staffCopy.nav.sections[section]} even>
        {metrics.map((metric) => (
          <Tile key={metric} metric={metric} dashboard={dashboard} permissions={permissions} />
        ))}
      </Grid>
    </>
  );
}

/**
 * The home page's dashboard: what needs a person, a strip each, only
 * when something does; the windows as tabs; the window's numbers in three
 * groups, each against the window before.
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
        <ul className={styles.actions} aria-label={copy.actionsTitle}>
          {dashboard.actions.map((action, i) => (
            <Action key={i} action={action} />
          ))}
        </ul>
      )}
      <Tabs
        label={copy.windows}
        current={String(dashboard.days)}
        tabs={DASHBOARD_WINDOWS.map((days) => ({
          key: String(days),
          label: copy.window(days),
          href: days === DASHBOARD_WINDOWS[0] ? "/staff" : `/staff?days=${days}`,
        }))}
      />
      {(Object.keys(DASHBOARD_SECTIONS) as DashboardSection[]).map((section) => (
        <Tiles key={section} section={section} dashboard={dashboard} permissions={permissions} />
      ))}
    </>
  );
}
