import type { Dashboard, SeriesPoint } from "@/lib/staff-dashboard";

/** Counts as a sparkline's points, windows of `days`, the last ending at the example's `asOf`. */
function windows(counts: number[], days = 7): SeriesPoint[] {
  return counts.map((count, i) => ({
    from: new Date(Date.UTC(2026, 9, 21, 12) - (counts.length - i) * days * 24 * 60 * 60 * 1000).toISOString(),
    count,
  }));
}

/**
 * A busy week with something waiting of each kind: a held MP import, an MP
 * whose address is blocked, and a failed import. Every tile has a number,
 * up or down on the week before.
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
  signedMp: null,
  series: {
    eventRegistrations: windows([70, 105, 376, 144, 220, 338, 498, 277]),
    supportersAdded: windows([37, 57, 168, 58, 157, 223, 437, 176]),
  },
  actions: [
    { kind: "held-sync", at: "2026-10-21T00:00:00.000Z", added: 0, removed: 21, changed: 3 },
    {
      kind: "blocked-mp",
      politicianId: 7,
      name: "Bouncy McTestface MP",
      at: "2026-10-19T09:30:00.000Z",
    },
    { kind: "failed-import", job: "import-controlai", at: "2026-10-21T02:00:00.000Z", error: "No PDF linked" },
  ],
};

/** A quiet month: nothing waiting, nothing counted but a few registrations. */
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
  signedMp: null,
  series: {
    eventRegistrations: windows([0, 2, 0, 1, 3, 0, 4, 4], 30),
    supportersAdded: windows([0, 0, 0, 0, 0, 0, 2, 0], 30),
  },
  actions: [],
};
