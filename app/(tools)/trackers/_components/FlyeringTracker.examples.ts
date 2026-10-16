// A race and its counts, for the tracker's tests and the component gallery.
import type { SourceCounts } from "@/lib/trackers";
import type { FlyeringRace } from "./FlyeringTracker";

export const exampleRace: FlyeringRace = {
  date: "26 September",
  day: "Saturday 26 September",
  eventApiId: "evt-x",
  eventUrl: "https://example.org/event",
  open: new Date("2026-09-26T12:00:00+01:00"),
  close: new Date("2026-09-26T16:00:00+01:00"),
  unit: "stall",
  closedMessage: "Stalls have closed.",
  untagged: "a stall tag",
  stalls: [
    { tag: "a", name: "Angel" },
    { tag: "b", name: "Brixton" },
    { tag: "c", name: "Camden" },
    { tag: "d", name: "Dalston" },
  ],
};

/** Registrations through each of the example race's four stalls, and from elsewhere. */
export const exampleCounts = (a: number, b: number, c: number, d: number, other = 0): SourceCounts => ({
  counts: { a, b, c, d },
  other,
  total: a + b + c + d + other,
});

/** Before the race, during it, just after it closed, and once the result is final. */
export const exampleTimes = {
  before: new Date("2026-09-26T10:00:00+01:00"),
  during: new Date("2026-09-26T13:00:00+01:00"),
  justClosed: new Date("2026-09-26T16:02:00+01:00"),
  final: new Date("2026-09-26T16:10:00+01:00"),
};
