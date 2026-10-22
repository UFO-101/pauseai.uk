import type { Dashboard, SeriesPoint } from "@/lib/staff-dashboard";
import { exampleAppliedSync, exampleFailedRun, exampleLumaResult, exampleRun } from "./RunList.examples";

/** Weekly counts as a sparkline's points, the last week ending at the example's `asOf`. */
function weekly(counts: number[]): SeriesPoint[] {
  return counts.map((count, i) => ({
    from: new Date(Date.UTC(2026, 9, 21, 12) - (counts.length - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    count,
  }));
}

/**
 * A busy week with something waiting of each kind: a held MP import, an MP
 * whose address is blocked, and a failed import. Every tile has a number,
 * up or down on the week before; the Luma import stopped short, the
 * ControlAI import failed, the signatories never ran.
 */
export const exampleDashboard: Dashboard = {
  days: 7,
  asOf: "2026-10-21T12:00:00.000Z",
  since: "2026-10-14T12:00:00.000Z",
  counts: {
    lettersSent: { current: 12, previous: 8 },
    lettersReplied: { current: 3, previous: 5 },
    mpsSigned: { current: 5, previous: 3 },
    eventRegistrations: { current: 277, previous: 498 },
    eventsHeld: { current: 9, previous: 6 },
    supportersAdded: { current: 176, previous: 437 },
    unsubscribes: { current: 1, previous: 3 },
  },
  testLetters: 2,
  byCampaign: {
    lettersSent: { "regulate-letter-pm": 9, "support-sobel-bill": 3 },
    mpsSigned: { "regulate-letter-pm": 3, "support-sobel-bill": 2 },
  },
  series: {
    eventRegistrations: weekly([70, 105, 376, 144, 220, 338, 498, 277]),
    supportersAdded: weekly([37, 57, 168, 58, 157, 223, 437, 176]),
  },
  actions: [
    { kind: "held-sync", at: "2026-10-21T00:00:00.000Z", added: 0, removed: 21, changed: 3 },
    {
      kind: "blocked-mp",
      politicianId: 7,
      name: "Bouncy McTestface MP",
      at: "2026-10-19T09:30:00.000Z",
      reason: "The address does not exist",
    },
    { kind: "failed-import", job: "import-controlai", at: "2026-10-21T02:00:00.000Z", error: "No PDF linked" },
  ],
  imports: [
    exampleRun(
      "import-luma",
      { ...exampleLumaResult, eventsLeft: 4, stoppedBy: "time" },
      { id: 5, at: "2026-10-21T11:17:00Z" },
    ),
    exampleRun(
      "sync-mps",
      { changes: { added: [], removed: [], changed: [] } },
      { id: 4, at: "2026-10-21T00:00:00Z", status: "unchanged" },
    ),
    exampleRun("check-mps", { problems: [] }, { id: 3, at: "2026-10-21T01:00:00Z" }),
    exampleFailedRun("import-controlai", "No PDF linked", { id: 2, at: "2026-10-21T02:00:00Z" }),
    undefined,
  ],
};

/** A quiet month: nothing waiting, nothing counted but a few registrations, every import well. */
export const exampleQuietDashboard: Dashboard = {
  days: 30,
  asOf: exampleDashboard.asOf,
  since: "2026-09-21T12:00:00.000Z",
  counts: {
    lettersSent: { current: 0, previous: 0 },
    lettersReplied: { current: 0, previous: 1 },
    mpsSigned: { current: 0, previous: 0 },
    eventRegistrations: { current: 4, previous: 4 },
    eventsHeld: { current: 1, previous: 0 },
    supportersAdded: { current: 0, previous: 2 },
    unsubscribes: { current: 0, previous: 0 },
  },
  testLetters: 0,
  byCampaign: { lettersSent: {}, mpsSigned: {} },
  series: {
    eventRegistrations: weekly([0, 2, 0, 1, 3, 0, 4, 4]),
    supportersAdded: weekly([0, 0, 0, 0, 0, 0, 2, 0]),
  },
  actions: [],
  imports: exampleDashboard.imports.map(() => exampleAppliedSync),
};
