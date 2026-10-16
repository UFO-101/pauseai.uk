import type { LumaEntry } from "@/lib/events";

/**
 * An event as Luma lists it: "Event n", on a Saturday afternoon in 2030, in
 * London's time zone, with whatever else is given. For the tests and the
 * component gallery.
 */
export const exampleEvent = (n: number, extra: Partial<LumaEntry["event"]> = {}): LumaEntry => ({
  event: {
    url: `evt-${n}`,
    name: `Event ${n}`,
    start_at: "2030-03-02T13:00:00.000Z",
    timezone: "Europe/London",
    ...extra,
  },
});
