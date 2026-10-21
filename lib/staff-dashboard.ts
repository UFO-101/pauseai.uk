import type { AnyImportRun } from "./import-runs";

// The staff home's dashboard: what happened in the last week, against the
// week before, and how each import's last run ended. The server fills it
// (lib/server/staff-dashboard.ts); StaffDashboard shows it.

/** The length of the dashboard's window, in days. */
export const DASHBOARD_DAYS = 7;

/** The dashboard's two rows of tiles: what people did, then what needs looking after. */
export const DASHBOARD_SECTIONS = {
  activity: ["lettersSent", "lettersReplied", "mpsSigned", "supportersAdded", "eventRegistrations"],
  operations: ["lettersBounced", "unsubscribes", "addressesBlocked"],
} as const;
export type DashboardSection = keyof typeof DASHBOARD_SECTIONS;
export type DashboardMetric = (typeof DASHBOARD_SECTIONS)[DashboardSection][number];

/** One metric: how many in the window, and how many in the window before it. */
export type Count = { week: number; previous: number };

/**
 * Where each tile leads: the page that lists what it counts, and the
 * permission it needs, if any. `worse` marks a number that's bad when it
 * rises, so its change is coloured the other way round.
 */
export const METRIC_LINKS: Record<DashboardMetric, { href: string; permission?: "supporters"; worse?: true }> = {
  lettersSent: { href: "/staff/letters?status=sent" },
  lettersReplied: { href: "/staff/letters?status=replied" },
  lettersBounced: { href: "/staff/letters?status=bounced", worse: true },
  mpsSigned: { href: "/staff/politicians" },
  supportersAdded: { href: "/staff/supporters", permission: "supporters" },
  eventRegistrations: { href: "/staff/supporters?registered=1", permission: "supporters" },
  unsubscribes: { href: "/staff/supporters?unsubscribed=1", permission: "supporters", worse: true },
  addressesBlocked: { href: "/staff/blocked-emails", worse: true },
};

export type Dashboard = {
  /** The start of the window, ISO. */
  since: string;
  counts: Record<DashboardMetric, Count>;
  /** Each job's newest run, in IMPORT_JOBS order; undefined for one that has never run. */
  imports: (AnyImportRun | undefined)[];
};

/** A run that ended well: nothing for the dashboard to point at. */
export function ranWell(run: AnyImportRun | undefined): boolean {
  if (!run || run.status === "failed" || run.status === "held") return false;
  return !(run.job === "import-luma" && run.result.stoppedBy !== undefined);
}
