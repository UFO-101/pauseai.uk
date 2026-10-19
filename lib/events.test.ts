import { describe, expect, it } from "vitest";
import { localGroups } from "@/lib/content/local-groups";
import {
  ANYWHERE,
  distanceKm,
  eventsNear,
  inPersonEventsFor,
  isOnlineEvent,
  filterEventsForLocalGroup,
  formatEventDate,
  formatEventTime,
  type LumaEntry,
  type Place,
} from "./events";

function entry(name: string, geo?: { city?: string; address?: string; region?: string }): LumaEntry {
  return {
    event: {
      url: name.toLowerCase().replace(/\W+/g, "-"),
      name,
      start_at: "2026-10-01T18:00:00.000Z",
      ...(geo ? { geo_address_info: geo } : {}),
    },
  };
}

const matchersFor = (name: string) => localGroups.find((c) => c.name === name)!.eventMatchers;
const names = (entries: LumaEntry[], localGroup: string) =>
  filterEventsForLocalGroup(entries, matchersFor(localGroup)).map((e) => e.event.name);

// Shapes taken from the live calendar: only some events carry a city, so the
// other two fields are what keep a local group page from looking empty.
const calendar = [
  entry("PauseAI Holborn & St Pancras Canvasing", { city: "London", region: "England" }),
  entry("PauseAI Scotland Meeting"),
  entry("TuesdayPauseday - Weekly Online Call"),
  entry("Bristol Social!", { city: "Bristol", region: "England" }),
  entry("Panel Discussion: Who's Responsible?", { city: "Edinburgh", region: "Scotland" }),
  entry("Tabling and Flyering for the PauseAI Protest", { address: "All Across London" }),
];

describe("filterEventsForLocalGroup", () => {
  it("matches on city, on free-text address, and on the event name", () => {
    expect(names(calendar, "London")).toEqual([
      "PauseAI Holborn & St Pancras Canvasing", // city
      "Tabling and Flyering for the PauseAI Protest", // address only
    ]);
    expect(names(calendar, "Glasgow")).toContain("PauseAI Scotland Meeting"); // name only
  });

  it("keeps the calendar's own order", () => {
    expect(names(calendar, "Glasgow")).toEqual(["PauseAI Scotland Meeting", "Panel Discussion: Who's Responsible?"]);
  });

  it("covers the local group's wider region, not just its host city", () => {
    expect(names(calendar, "Glasgow")).toContain("Panel Discussion: Who's Responsible?");
    expect(names(calendar, "West of England")).toEqual(["Bristol Social!"]);
  });

  it("ignores region, which is the same for most of the calendar", () => {
    const elsewhere = [entry("Some national event", { region: "England", city: "Leeds" })];
    for (const localGroup of localGroups) {
      expect(names(elsewhere, localGroup.name), localGroup.name).toEqual([]);
    }
  });

  it("matches whole words only", () => {
    expect(names([entry("Meetup", { city: "Bathurst" })], "West of England")).toEqual([]);
    expect(names([entry("Meetup", { city: "New Oxforden" })], "Oxford")).toEqual([]);
    expect(names([entry("Meetup", { city: "Bath" })], "West of England")).toEqual(["Meetup"]);
  });

  it("ignores case and punctuation", () => {
    // Apostrophes and possessives are common in real event titles.
    expect(names([entry("PauseAI Oxfordshire's autumn plans")], "Oxford")).toHaveLength(1);
    expect(names([entry("bristol social!")], "West of England")).toHaveLength(1);
  });

  it("leaves UK-wide and online events off local group pages", () => {
    const online = [entry("TuesdayPauseday - Weekly Online Call"), entry("PauseAI UK All Hands")];
    for (const localGroup of localGroups) {
      expect(names(online, localGroup.name), localGroup.name).toEqual([]);
    }
  });

  it("returns nothing rather than throwing for a local group with no events", () => {
    expect(names(calendar, "Leicester")).toEqual([]);
  });
});

describe("local group event matchers", () => {
  it("every local group declares at least one matcher", () => {
    expect(localGroups.length).toBeGreaterThan(0);
    for (const localGroup of localGroups) {
      expect(localGroup.eventMatchers.length, localGroup.name).toBeGreaterThan(0);
    }
  });
});

describe("formatEventDate and formatEventTime", () => {
  const startAt = "2030-03-02T13:00:00.000Z";

  it("formats in the event's own timezone", () => {
    expect(formatEventDate(startAt, "Europe/London")).toBe("Sat 2 Mar");
    expect(formatEventTime(startAt, "Europe/London")).toBe("13:00");
    expect(formatEventTime(startAt, "America/New_York")).toBe("08:00");
  });

  it("defaults to UK time", () => {
    expect(formatEventTime("2030-07-01T12:00:00.000Z")).toBe("13:00");
  });

  it("falls back to UK time for a timezone the browser doesn't know", () => {
    expect(formatEventDate(startAt, "Mars/Olympus_Mons")).toBe("Sat 2 Mar");
    expect(formatEventTime(startAt, "Mars/Olympus_Mons")).toBe("13:00");
  });
});

describe("events near someone", () => {
  const WESTMINSTER: Place = { latitude: 51.4995, longitude: -0.1248 };
  const OXFORD: Place = { latitude: 51.752, longitude: -1.2577 };
  const MANCHESTER: Place = { latitude: 53.4808, longitude: -2.2426 };

  const at = (name: string, day: number, place?: Place, city?: string): LumaEntry => ({
    event: {
      url: name,
      name,
      start_at: `2030-01-${String(day).padStart(2, "0")}T18:00:00.000Z`,
      ...(place || city ? { geo_address_info: { city }, ...(place ? { place } : {}) } : {}),
    },
  });
  // Soonest first, as Luma sends them.
  const calendar = [
    at("online-1", 1),
    at("manchester", 2, MANCHESTER, "Manchester"),
    at("london-1", 3, WESTMINSTER, "London"),
    at("oxford-no-venue", 4, undefined, "Oxford"),
    at("online-2", 5),
    at("oxford", 6, OXFORD, "Oxford"),
    at("london-2", 7, WESTMINSTER, "London"),
    at("london-3", 8, WESTMINSTER, "London"),
    at("online-3", 9),
    at("online-4", 10),
  ];
  const urls = (entries: LumaEntry[]) => entries.map((e) => e.event.url);

  it("measures distances along the Earth's surface", () => {
    expect(distanceKm(WESTMINSTER, WESTMINSTER)).toBe(0);
    expect(distanceKm(WESTMINSTER, OXFORD)).toBeCloseTo(83, 0);
    expect(distanceKm(OXFORD, WESTMINSTER)).toBeCloseTo(distanceKm(WESTMINSTER, OXFORD), 9);
    expect(distanceKm(WESTMINSTER, MANCHESTER)).toBeCloseTo(263, 0);
  });

  it("suggests a row of four: up to three in person within 50km, then online ones, in date order", () => {
    expect(urls(eventsNear(calendar, WESTMINSTER))).toEqual(["online-1", "london-1", "london-2", "london-3"]);
    expect(urls(eventsNear(calendar, MANCHESTER))).toEqual(["online-1", "manchester", "online-2", "online-3"]);
  });

  it("leaves out events too far away, and in-person ones with no place yet", () => {
    // Oxford's own events are near Oxford; London, at about 83km, isn't, and
    // nor is the Oxford event with no venue, as its distance isn't known.
    expect(urls(eventsNear(calendar, OXFORD))).toEqual(["online-1", "online-2", "oxford", "online-3"]);
  });

  it("suggests the next four online events when none is near, or there's nowhere to measure from", () => {
    const CARDIFF: Place = { latitude: 51.4816, longitude: -3.1791 };
    for (const here of [CARDIFF, null, undefined])
      expect(urls(eventsNear(calendar, here))).toEqual(["online-1", "online-2", "online-3", "online-4"]);
    expect(eventsNear([], WESTMINSTER)).toEqual([]);
  });

  describe("in-person events for where someone chose", () => {
    it("tells online events from in-person ones by their address", () => {
      expect(isOnlineEvent(at("online", 1))).toBe(true);
      expect(isOnlineEvent(at("oxford-no-venue", 1, undefined, "Oxford"))).toBe(false);
    });

    it("lists every in-person event, soonest first, anywhere in the UK", () => {
      expect(urls(inPersonEventsFor(calendar, ANYWHERE, localGroups))).toEqual([
        "manchester",
        "london-1",
        "oxford-no-venue",
        "oxford",
        "london-2",
        "london-3",
      ]);
    });

    it("lists a local group's in-person events by its matchers, venue or not", () => {
      const oxford = { kind: "group", name: "Oxford" } as const;
      expect(urls(inPersonEventsFor(calendar, oxford, localGroups))).toEqual(["oxford-no-venue", "oxford"]);
      // A group that isn't on the list is no filter at all.
      expect(inPersonEventsFor(calendar, oxford, [])).toHaveLength(6);
    });

    it("lists the in-person events within 50km of a place", () => {
      const nearLondon = { kind: "place", place: WESTMINSTER } as const;
      expect(urls(inPersonEventsFor(calendar, nearLondon, localGroups))).toEqual(["london-1", "london-2", "london-3"]);
    });

    it("counts an event with no place as near when it's a nearby group's", () => {
      // The Oxford event with no venue is Oxford's by its city, and Oxford is near.
      const nearOxford = { kind: "place", place: OXFORD, name: "Oxford" } as const;
      expect(urls(inPersonEventsFor(calendar, nearOxford, localGroups))).toEqual(["oxford-no-venue", "oxford"]);
      expect(urls(inPersonEventsFor(calendar, { kind: "place", place: MANCHESTER }, localGroups))).toEqual([
        "manchester",
      ]);
    });
  });
});
