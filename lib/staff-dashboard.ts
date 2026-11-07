import type { ImportJob } from "./import-runs";
import type { Permission } from "./staff-permissions";
import { staffCopy } from "./content/staff-interface";
import { now } from "./now";
import type { SupporterSource } from "./supporters";

// The staff home's dashboard: what needs a person, and what happened in
// the window against the window before. The
// server fills it (lib/server/staff-dashboard.ts); StaffDashboard shows it.

/** The windows the dashboard can show, in days; the first is the default. */
export const DASHBOARD_WINDOWS = [7, 30, 90] as const;
export type DashboardWindow = (typeof DASHBOARD_WINDOWS)[number];

/** The window a URL asks for ("?days=30"), or the default. */
export function dashboardWindow(days: string | undefined): DashboardWindow {
  const found = DASHBOARD_WINDOWS.find((window) => String(window) === days);
  return found ?? DASHBOARD_WINDOWS[0];
}

/** A list's date filter from its URL ("?first=30"): those of the last so many days, as a window; otherwise off. */
export function listWindow(days: string): DashboardWindow | undefined {
  return DASHBOARD_WINDOWS.find((window) => String(window) === days);
}

/** A date filter's choices. */
export const WINDOW_OPTIONS = DASHBOARD_WINDOWS.map((days) => ({
  value: String(days),
  label: staffCopy.filters.lastDays(days),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

/** The start of a window ending now, ISO. */
export function windowStart(days: number): string {
  return new Date(now().getTime() - days * DAY_MS).toISOString();
}

/** How many windows a sparkline or a chart of bars shows, the current one last. */
export const SERIES_POINTS = 8;

/** The tiles, in three groups, in the sidebar's order and under its names. */
export const DASHBOARD_SECTIONS = {
  supporters: ["supportersAdded", "unsubscribes"],
  politicians: ["lettersSent", "lettersReplied", "politiciansAgreed"],
  events: ["eventRegistrations", "eventsHeld"],
} as const;
export type DashboardSection = keyof typeof DASHBOARD_SECTIONS;
export type DashboardMetric = (typeof DASHBOARD_SECTIONS)[DashboardSection][number];

/** The metrics shown with a bar by campaign under the number. */
export const BY_CAMPAIGN = ["lettersSent", "politiciansAgreed"] as const satisfies readonly DashboardMetric[];
export type CampaignMetric = (typeof BY_CAMPAIGN)[number];

/** The metrics shown with a sparkline: counts that move and mean something. */
export const WITH_SERIES = ["eventRegistrations"] as const satisfies readonly DashboardMetric[];
export type SeriesMetric = (typeof WITH_SERIES)[number];

/** One metric: how many in the window, and how many in the window before it. */
export type Count = { current: number; previous: number };

/** One point of a sparkline: the count in a window starting at `from`, ISO. */
export type SeriesPoint = { from: string; count: number };

/** One bar of new supporters: those first seen in a window starting at `from`, ISO, each under their earliest source. */
export type SourcePoint = SeriesPoint & { sources: Partial<Record<SupporterSource, number>> };

/**
 * Where each tile leads: the page that lists exactly what it counts in the
 * window (`days`), and the permissions it takes to see it there; without them
 * the tile is no link. The politicians agreed tile's page depends on who agreed
 * (agreedHref). `worse` marks a number that's bad when it rises, so its change
 * is coloured the other way round.
 */
export const METRIC_LINKS: Record<
  DashboardMetric,
  { href: (days: DashboardWindow) => string; permissions: readonly Permission[]; worse?: true }
> = {
  lettersSent: { href: (days) => `/staff/emails?type=campaign&sent=${days}`, permissions: ["supporters"] },
  lettersReplied: {
    href: (days) => `/staff/emails?type=campaign&type=mailing&replied=${days}`,
    permissions: ["supporters"],
  },
  politiciansAgreed: { href: (days) => `/staff/politicians?agreed=${days}&status=any&sort=asks`, permissions: [] },
  eventRegistrations: { href: (days) => `/staff/supporters?registered=${days}`, permissions: ["supporters"] },
  eventsHeld: { href: (days) => `/staff/events?when=past&held=${days}`, permissions: [] },
  supportersAdded: {
    href: (days) => `/staff/supporters?first=${days}&sort=first&dir=desc`,
    permissions: ["supporters"],
  },
  unsubscribes: { href: (days) => `/staff/supporters?unsubscribed=${days}`, permissions: ["supporters"], worse: true },
};

/** Something waiting for a person, with where its button goes. */
export type DashboardAction =
  | { kind: "held-sync"; at: string; added: number; removed: number; changed: number }
  | { kind: "blocked-mp"; politicianId: number; name: string; isTest: boolean; at: string }
  | { kind: "failed-import"; job: ImportJob; at: string; error: string }
  | { kind: "letters-inbox"; inbox: string; count: number; at: string };

export type Dashboard = {
  /** The window's length in days. */
  days: DashboardWindow;
  /** When the dashboard was drawn, ISO. */
  asOf: string;
  /** The start of the window, ISO. */
  since: string;
  counts: Record<DashboardMetric, Count>;
  /** The window's count by campaign slug, for the tiles with a bar. */
  byCampaign: Record<CampaignMetric, Record<string, number>>;
  /** The politician who agreed in the window, when only one did, for any number of asks. */
  agreedMp: number | null;
  /** SERIES_POINTS windows of `days`, oldest first, the current one last, for the tiles with a sparkline. */
  series: Record<SeriesMetric, SeriesPoint[]>;
  /** SERIES_POINTS windows of `days`, oldest first, the current one last, of new supporters by their earliest source. */
  supportersBySource: SourcePoint[];
  actions: DashboardAction[];
};

/** Where the politicians agreed tile leads: the page of the one politician who agreed in the window, or the list of those who did. */
export function agreedHref({ agreedMp, days }: Pick<Dashboard, "agreedMp" | "days">): string {
  return agreedMp !== null ? `/staff/politicians/${agreedMp}` : METRIC_LINKS.politiciansAgreed.href(days);
}

export function isCampaignMetric(metric: DashboardMetric): metric is CampaignMetric {
  return (BY_CAMPAIGN as readonly DashboardMetric[]).includes(metric);
}

export function isSeriesMetric(metric: DashboardMetric): metric is SeriesMetric {
  return (WITH_SERIES as readonly DashboardMetric[]).includes(metric);
}
