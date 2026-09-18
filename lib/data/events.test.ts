import { describe, expect, it } from "vitest";
import { chapters } from "./chapters";
import { filterEventsForChapter, type LumaEntry } from "./events";

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

const matchersFor = (name: string) => chapters.find((c) => c.name === name)!.eventMatchers;
const names = (entries: LumaEntry[], chapter: string) =>
  filterEventsForChapter(entries, matchersFor(chapter)).map((e) => e.event.name);

// Shapes taken from the live calendar: only some events carry a city, so the
// other two fields are what keep a chapter page from looking empty.
const calendar = [
  entry("PauseAI Holborn & St Pancras Canvasing", { city: "London", region: "England" }),
  entry("PauseAI Scotland Meeting"),
  entry("TuesdayPauseday - Weekly Online Call"),
  entry("Bristol Social!", { city: "Bristol", region: "England" }),
  entry("Panel Discussion: Who's Responsible?", { city: "Edinburgh", region: "Scotland" }),
  entry("Tabling and Flyering for the PauseAI Protest", { address: "All Across London" }),
];

describe("filterEventsForChapter", () => {
  it("matches on city, on free-text address, and on the event name", () => {
    expect(names(calendar, "London")).toEqual([
      "PauseAI Holborn & St Pancras Canvasing", // city
      "Tabling and Flyering for the PauseAI Protest", // address only
    ]);
    expect(names(calendar, "Glasgow")).toContain("PauseAI Scotland Meeting"); // name only
  });

  it("keeps the calendar's own order", () => {
    expect(names(calendar, "Glasgow")).toEqual([
      "PauseAI Scotland Meeting",
      "Panel Discussion: Who's Responsible?",
    ]);
  });

  it("covers the chapter's wider region, not just its host city", () => {
    expect(names(calendar, "Glasgow")).toContain("Panel Discussion: Who's Responsible?");
    expect(names(calendar, "West of England")).toEqual(["Bristol Social!"]);
  });

  it("ignores region, which is the same for most of the calendar", () => {
    const elsewhere = [entry("Some national event", { region: "England", city: "Leeds" })];
    for (const chapter of chapters) {
      expect(names(elsewhere, chapter.name), chapter.name).toEqual([]);
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

  it("leaves UK-wide and online events off chapter pages", () => {
    const online = [entry("TuesdayPauseday - Weekly Online Call"), entry("PauseAI UK All Hands")];
    for (const chapter of chapters) {
      expect(names(online, chapter.name), chapter.name).toEqual([]);
    }
  });

  it("returns nothing rather than throwing for a chapter with no events", () => {
    expect(names(calendar, "Leicester")).toEqual([]);
  });
});

describe("chapter event matchers", () => {
  it("every chapter declares at least one matcher", () => {
    expect(chapters.length).toBeGreaterThan(0);
    for (const chapter of chapters) {
      expect(chapter.eventMatchers.length, chapter.name).toBeGreaterThan(0);
    }
  });
});
