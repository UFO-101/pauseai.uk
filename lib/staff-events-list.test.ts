import { describe, expect, it, vi } from "vitest";
import type { SearchedEvent } from "@/lib/server/staff-events";
import { EVENTS_PAGE_SIZE, findEvents, type EventFilter } from "./staff-events-list";

const NOW = "2026-11-02T12:00:00.000Z";

const event = (id: string, more: Partial<SearchedEvent> = {}): SearchedEvent => ({
  id,
  name: `Event ${id}`,
  url: `https://luma.com/${id}`,
  startAt: "2026-12-01T18:00:00.000Z",
  city: "London",
  tags: [],
  removed: false,
  going: 0,
  owner: null,
  doc: null,
  hosts: [],
  hostEmails: [],
  ...more,
});

const events = [
  event("a", {
    name: "Banner making",
    startAt: "2026-11-20T18:00:00.000Z",
    city: "Oxford",
    going: 5,
    tags: ["Oxford"],
    hosts: [{ name: "Jane Smith", supporterId: 1 }],
    hostEmails: ["jane.host@example.com"],
  }),
  event("b", { name: "alpha talk", startAt: "2026-11-10T18:00:00.000Z", city: null, going: 9, owner: "jo@pauseai.uk" }),
  event("c", { startAt: "2026-11-10T18:00:00.000Z", doc: "https://docs.google.com/d", tags: ["Big"] }),
  event("d", { name: "Cancelled picnic", removed: true }),
  event("old", { startAt: "2025-01-01T18:00:00.000Z" }),
  event("recent", { startAt: "2026-10-01T18:00:00.000Z", owner: "sean@pauseai.uk" }),
];

const future = (more: Partial<EventFilter> = {}): EventFilter => ({
  tab: "future",
  removed: false,
  sort: { key: "start", dir: "asc" },
  page: 1,
  ...more,
});

const ids = (filter: EventFilter) => findEvents(events, filter, NOW).events.map((e) => e.id);

describe("findEvents", () => {
  it("finds those started in the last so many days", () => {
    vi.stubEnv("FIXTURE_NOW", NOW);
    const held = [
      event("this-week", { startAt: "2026-10-30T18:00:00.000Z" }),
      event("this-month", { startAt: "2026-10-10T18:00:00.000Z" }),
      event("to-come", { startAt: "2026-11-20T18:00:00.000Z" }),
    ];
    const past = { ...future(), tab: "past" as const, sort: { key: "start" as const, dir: "desc" as const } };
    const found = (heldDays: number) => findEvents(held, { ...past, heldDays }, NOW).events.map((e) => e.id);
    expect(found(7)).toEqual(["this-week"]);
    expect(found(30)).toEqual(["this-week", "this-month"]);
    vi.unstubAllEnvs();
  });

  it("finds those to come on Future, soonest first, a tie by ID; and those past on Past, latest first", () => {
    expect(ids(future())).toEqual(["b", "c", "a"]);
    expect(ids({ tab: "past", removed: false, sort: { key: "start", dir: "desc" }, page: 1 })).toEqual([
      "recent",
      "old",
    ]);
    expect(findEvents(events, future(), NOW)).toMatchObject({ total: 3, pages: 1, removed: 0 });
  });

  it("searches names, whatever their case, and hosts' names and emails, and owners' emails", () => {
    expect(ids(future({ search: "ALPHA" }))).toEqual(["b"]);
    expect(ids(future({ search: "jane smith" }))).toEqual(["a"]);
    expect(ids(future({ search: "jane.host@" }))).toEqual(["a"]);
    expect(ids(future({ search: "jo@pauseai" }))).toEqual(["b"]);
  });

  it("finds only those taken off Luma, or only those still on it", () => {
    expect(ids(future({ removed: true }))).toEqual(["d"]);
    expect(ids(future())).not.toContain("d");
  });

  it("counts, for a search that finds none, those it would find taken off Luma", () => {
    expect(findEvents(events, future({ search: "picnic" }), NOW)).toMatchObject({ total: 0, removed: 1 });
    // Not when it finds some, nor when it's of those taken off Luma, nor with no search.
    expect(findEvents(events, future({ search: "alpha" }), NOW).removed).toBe(0);
    expect(findEvents(events, future({ search: "picnic", removed: true }), NOW)).toMatchObject({
      total: 1,
      removed: 0,
    });
    expect(findEvents(events, future({ search: "nothing" }), NOW).removed).toBe(0);
    expect(findEvents(events, future({ owner: ["nobody@pauseai.uk"] }), NOW).removed).toBe(0);
  });

  it("finds those with any of an owner, a tag or a place; and leaves out those with any", () => {
    expect(ids(future({ owner: ["none"] }))).toEqual(["c", "a"]);
    expect(ids(future({ owner: ["jo@pauseai.uk"] }))).toEqual(["b"]);
    expect(ids(future({ tag: ["Oxford", "Big"] }))).toEqual(["c", "a"]);
    expect(ids(future({ place: ["online"] }))).toEqual(["b"]);
    expect(ids(future({ place: ["London", "Oxford"] }))).toEqual(["c", "a"]);
    expect(ids(future({ not: { owner: ["none"], tag: ["Oxford"] } }))).toEqual(["b"]);
  });

  it("sorts by each column, either way, a tie by when it starts in the tab's own order", () => {
    const by = (key: EventFilter["sort"]["key"], dir: "asc" | "desc") => ids(future({ sort: { key, dir } }));
    expect(by("name", "asc")).toEqual(["b", "a", "c"]);
    expect(by("name", "desc")).toEqual(["c", "a", "b"]);
    // Online, with no city, first.
    expect(by("place", "asc")).toEqual(["b", "c", "a"]);
    expect(by("going", "desc")).toEqual(["b", "a", "c"]);
    // No owner first; those with none, by when.
    expect(by("owner", "asc")).toEqual(["c", "a", "b"]);
    // No doc first, either way.
    expect(by("doc", "asc")).toEqual(["b", "a", "c"]);
    expect(by("doc", "desc")).toEqual(["c", "b", "a"]);
    expect(
      findEvents(events, { tab: "past", removed: false, sort: { key: "going", dir: "desc" }, page: 1 }, NOW).events.map(
        (e) => e.id,
      ),
    ).toEqual(["recent", "old"]);
  });

  it("gives a page at a time", () => {
    const many = Array.from({ length: EVENTS_PAGE_SIZE + 2 }, (_, i) => event(`e${String(i).padStart(3, "0")}`));
    const second = findEvents(many, future({ page: 2 }), NOW);
    expect(second).toMatchObject({ total: EVENTS_PAGE_SIZE + 2, pages: 2 });
    expect(second.events.map((e) => e.id)).toEqual(["e100", "e101"]);
    expect(findEvents([], future(), NOW)).toEqual({ events: [], total: 0, pages: 1, removed: 0 });
  });
});
