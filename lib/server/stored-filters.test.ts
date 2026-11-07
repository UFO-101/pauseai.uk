import { describe, expect, it } from "vitest";
import { migrate } from "@/scripts/db-migrate.mjs";
import {
  addTestPolitician,
  describeWithDatabase,
  MAKES_DATABASES,
  useDatabaseUpTo,
  useTestDatabase,
} from "@/tests/database";
import { query } from "./db";
import { storedFilter } from "@/lib/staff-search";
import { logChange } from "./audit";
import { checkStoredFilter, filterProblems } from "./stored-filters";

describe("storedFilter", () => {
  it("keeps only who the list shows, without the sort, the page or blanks; a list where it repeats", () => {
    expect(
      storedFilter("politicians", {
        q: "dummy",
        house: "",
        party: ["Labour", "!Green"],
        flag: ["important"],
        sort: "name",
        dir: "desc",
        page: "2",
        other: "x",
      }),
    ).toEqual({ list: "politicians", params: { q: "dummy", party: ["Labour", "!Green"], flag: "important" } });
    expect(storedFilter("supporters", { contact: "email:luma-calendar:yes", sort: "name" })).toEqual({
      list: "supporters",
      params: { contact: "email:luma-calendar:yes" },
    });
  });
});

const AT = "2026-11-03T10:00:00.000Z";

describe("checkStoredFilter", () => {
  it("reads back a stored filter", () => {
    const filter = { list: "politicians", params: { house: "commons", party: ["A", "B"] } };
    expect(checkStoredFilter(filter)).toEqual(filter);
  });

  it.each([
    ["nothing", null],
    ["a string", "house=commons"],
    ["another list", { list: "letters", params: {} }],
    ["no parameters", { list: "politicians" }],
    ["parameters that are null", { list: "politicians", params: null }],
    ["a parameter of another list", { list: "politicians", params: { event: "evt-1" } }],
    ["a value that isn't text", { list: "politicians", params: { house: 1 } }],
    ["a list with a number in it", { list: "supporters", params: { event: ["evt-1", 2] } }],
    ["ticks that aren't an object", { list: "politicians", params: {}, picked: "1" }],
    ["ticks that are null", { list: "politicians", params: {}, picked: null }],
    ["ticks that aren't IDs", { list: "politicians", params: {}, picked: { ids: [1, 0] } }],
    ["ticks with no IDs", { list: "politicians", params: {}, picked: {} }],
    ["a group that isn't an object", { list: "politicians", params: {}, picked: { ids: [1], from: "x" } }],
    [
      "a group of another list's parameters",
      { list: "politicians", params: {}, picked: { ids: [1], from: { params: { event: "e" }, at: AT, found: [1] } } },
    ],
    [
      "a group found at no time",
      { list: "politicians", params: {}, picked: { ids: [1], from: { params: {}, at: "soon", found: [1] } } },
    ],
    [
      "a group with no time",
      { list: "politicians", params: {}, picked: { ids: [1], from: { params: {}, found: [1] } } },
    ],
    [
      "a group that found what aren't IDs",
      { list: "politicians", params: {}, picked: { ids: [1], from: { params: {}, at: AT, found: ["1"] } } },
    ],
  ])("refuses %s", (_, value) => {
    expect(checkStoredFilter(value)).toBeUndefined();
  });

  it("reads back ticks, and the group they were ticked from, keeping only its parameters that choose who", () => {
    expect(checkStoredFilter({ list: "politicians", params: {}, picked: { ids: [] } })).toEqual({
      list: "politicians",
      params: {},
      picked: { ids: [] },
    });
    expect(
      checkStoredFilter({
        list: "politicians",
        params: {},
        picked: { ids: [1, 2], from: { params: { house: "commons", q: "" }, at: AT, found: [1, 3] } },
      }),
    ).toEqual({
      list: "politicians",
      params: {},
      picked: { ids: [1, 2], from: { params: { house: "commons" }, at: AT, found: [1, 3] } },
    });
  });
});

describeWithDatabase("filterProblems", () => {
  useTestDatabase();

  it("finds nothing wrong with a politicians filter of values the site knows, left out or not", async () => {
    await addTestPolitician({ party: "Labour" });
    expect(
      await filterProblems({
        list: "politicians",
        params: {
          q: "anything at all",
          house: "lords",
          status: "any",
          party: ["Labour", "!Labour"],
          flag: "!test",
          nation: "wales",
          email: "yes",
          ask: "frontier-ai-letter",
          answer: "signed",
        },
      }),
    ).toEqual([]);
    expect(await filterProblems({ list: "politicians", params: { answer: "going" } })).toEqual([]);
    await logChange("jo@pauseai.uk", "add note", { noteId: 1 });
    expect(
      await filterProblems({
        list: "audit-log",
        params: { q: "x", actor: ["jo@pauseai.uk", "!gone@pauseai.uk"], action: "add note", when: "5" },
      }),
    ).toEqual(["actor=!gone@pauseai.uk", "when=5"]);
  });

  it("names each politician ticked who isn't one any more", async () => {
    const polly = await addTestPolitician();
    expect(await filterProblems({ list: "politicians", params: {}, picked: { ids: [polly, 999999] } })).toEqual([
      "person=999999",
    ]);
  });

  it("names each value of a politicians filter the site doesn't know", async () => {
    expect(
      await filterProblems({
        list: "politicians",
        params: {
          house: "moon",
          party: ["Gone Party", "!Old Party"],
          flag: "shiny",
          ask: "frontier-ai-letter",
          answer: "going",
        },
      }),
    ).toEqual(["house=moon", "party=Gone Party", "party=!Old Party", "flag=shiny", "answer=going"]);
    expect(await filterProblems({ list: "politicians", params: { ask: "no-such-ask", status: "asleep" } })).toEqual([
      "ask=no-such-ask",
      "status=asleep",
    ]);
  });

  it("checks a supporters filter's events against those imported, and its MPs against those in office", async () => {
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('evt-1', 'Meet-up', 'https://lu.ma/a', now(), 'manage')`,
    );
    const mp = await addTestPolitician({ name: "Mo Manchester", constituency: "Manchester Central" });
    expect(
      await filterProblems({
        list: "supporters",
        params: {
          q: "jane",
          activity: ["member", "!letter"],
          contact: "email:luma-calendar:yes",
          event: ["evt-1", "!evt-1"],
          campaign: "support-sobel-bill",
          wrote: "no",
          nation: "scotland",
          mp: [String(mp), `!${mp}`],
          near: "EH1",
          within: "10",
        },
      }),
    ).toEqual([]);
    expect(
      await filterProblems({
        list: "supporters",
        params: {
          activity: "dancer",
          contact: "email:renamed-topic:yes",
          event: ["evt-gone", "!evt-1"],
          campaign: "old-campaign",
          wrote: "maybe",
          mp: String(mp + 1),
          within: "3",
        },
      }),
    ).toEqual([
      "activity=dancer",
      "contact=email:renamed-topic:yes",
      "event=evt-gone",
      "campaign=old-campaign",
      "wrote=maybe",
      `mp=${mp + 1}`,
      "within=3",
    ]);
  });
});

describeWithDatabase("filterProblems on the events list", () => {
  useTestDatabase();

  it("knows its owners, tags and places, whichever way they're chosen, and names the rest", async () => {
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ('jo@pauseai.uk', 'admin@pauseai.uk')");
    await expect(
      filterProblems({
        list: "events",
        params: {
          q: "anything",
          owner: ["jo@pauseai.uk", "!none", "gone@pauseai.uk"],
          place: ["online", "Atlantis"],
          tag: "!Gone",
          removed: "yes",
        },
      }),
    ).resolves.toEqual(["owner=gone@pauseai.uk", "place=Atlantis", "tag=!Gone"]);
  });
});

describeWithDatabase("migration 0059_filters_by_nation", MAKES_DATABASES, () => {
  const db = useDatabaseUpTo("0058");

  it("renames a saved filter's country to nation, leaving the rest of it and filters without one", async () => {
    await query(
      `INSERT INTO mailings (title, audience, channel, topic, filter, body, created_by, sent_from, from_name, due_at, state)
       SELECT title, 'politicians', 'email', NULL, filter::jsonb, '{}', 'jo@pauseai.uk', 'jo@pauseai.uk', 'PauseAI UK', now(), 'draft'
       FROM (VALUES ('Scotland', '{"list": "politicians", "params": {"country": ["!scotland"], "party": "Green"}}'),
                    ('Greens', '{"list": "politicians", "params": {"party": "Green"}}')) v (title, filter)`,
    );

    expect(migrate(db.url, { appliedUpTo: "0058" })).toContain("0059_filters_by_nation");

    expect(
      await query("SELECT title, filter FROM mailings WHERE title IN ('Greens', 'Scotland') ORDER BY title"),
    ).toEqual([
      { title: "Greens", filter: { list: "politicians", params: { party: "Green" } } },
      { title: "Scotland", filter: { list: "politicians", params: { nation: ["!scotland"], party: "Green" } } },
    ]);
  });
});
