import type { ImportJob } from "./import-runs";
import type { Permission } from "./staff-permissions";

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

/** How many windows a sparkline shows, the current one last. */
export const SERIES_POINTS = 8;

/** The tiles, in three groups: MPs, events, supporters. */
export const DASHBOARD_SECTIONS = {
  mps: ["lettersSent", "lettersReplied", "mpsSigned"],
  events: ["eventRegistrations", "eventsHeld"],
  supporters: ["supportersAdded", "unsubscribes"],
} as const;
export type DashboardSection = keyof typeof DASHBOARD_SECTIONS;
export type DashboardMetric = (typeof DASHBOARD_SECTIONS)[DashboardSection][number];

/** The metrics shown with a bar by campaign under the number. */
export const BY_CAMPAIGN = ["lettersSent", "mpsSigned"] as const satisfies readonly DashboardMetric[];
export type CampaignMetric = (typeof BY_CAMPAIGN)[number];

/** The metrics shown with a sparkline: counts that move and mean something. */
export const WITH_SERIES = ["eventRegistrations", "supportersAdded"] as const satisfies readonly DashboardMetric[];
export type SeriesMetric = (typeof WITH_SERIES)[number];

/** One metric: how many in the window, and how many in the window before it. */
export type Count = { current: number; previous: number };

/** One point of a sparkline: the count in a window starting at `from`, ISO. */
export type SeriesPoint = { from: string; count: number };

/**
 * Where each tile leads: the page that lists what it counts, and the
 * permission it needs, if any. A tile without a page is no link; the MPs
 * signed tile's page depends on who signed (signedHref). `worse`
 * marks a number that's bad when it rises, so its change is coloured the
 * other way round.
 */
export const METRIC_LINKS: Record<DashboardMetric, { href?: string; permission?: Permission; worse?: true }> = {
  lettersSent: { href: "/staff/letters?status=sent", permission: "supporters" },
  lettersReplied: { href: "/staff/letters?status=replied", permission: "supporters" },
  mpsSigned: { href: "/staff/politicians" },
  eventRegistrations: { href: "/staff/supporters?activity=registered", permission: "supporters" },
  eventsHeld: {},
  supportersAdded: { href: "/staff/supporters", permission: "supporters" },
  unsubscribes: {
    href: "/staff/supporters?subscription=luma-calendar:unsubscribed",
    permission: "supporters",
    worse: true,
  },
};

/** Something waiting for a person, with where its button goes. */
export type DashboardAction =
  | { kind: "held-sync"; at: string; added: number; removed: number; changed: number }
  | { kind: "blocked-mp"; politicianId: number; name: string; at: string }
  | { kind: "failed-import"; job: ImportJob; at: string; error: string };

export type Dashboard = {
  /** The window's length in days. */
  days: DashboardWindow;
  /** When the dashboard was drawn, ISO. */
  asOf: string;
  /** The start of the window, ISO. */
  since: string;
  counts: Record<DashboardMetric, Count>;
  /** Letters sent to test MPs in the window, which the letters tile leaves out of its number. */
  testLetters: number;
  /** The window's count by campaign slug, for the tiles with a bar. */
  byCampaign: Record<CampaignMetric, Record<string, number>>;
  /** The politician who signed in the window, when only one did, for any number of campaigns. */
  signedMp: number | null;
  /** SERIES_POINTS windows of `days`, oldest first, the current one last, for the tiles with a sparkline. */
  series: Record<SeriesMetric, SeriesPoint[]>;
  actions: DashboardAction[];
};

/**
 * Where the MPs signed tile leads: the page of the one politician who
 * signed in the window, or the politicians who signed the campaign most
 * signed in it, newest first, or with no signatures, all the politicians.
 */
export function signedHref({ signedMp, byCampaign }: Pick<Dashboard, "signedMp" | "byCampaign">): string {
  if (signedMp !== null) return `/staff/politicians/${signedMp}`;
  const [top] = Object.entries(byCampaign.mpsSigned).sort(([, a], [, b]) => b - a);
  return top ? `/staff/politicians?campaign=${top[0]}&sort=${top[0]}` : "/staff/politicians";
}

export function isCampaignMetric(metric: DashboardMetric): metric is CampaignMetric {
  return (BY_CAMPAIGN as readonly DashboardMetric[]).includes(metric);
}

export function isSeriesMetric(metric: DashboardMetric): metric is SeriesMetric {
  return (WITH_SERIES as readonly DashboardMetric[]).includes(metric);
}
