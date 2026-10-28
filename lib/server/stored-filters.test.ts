import { describe, expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { storedFilter } from "@/lib/staff-search";
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
  ])("refuses %s", (_, value) => {
    expect(checkStoredFilter(value)).toBeUndefined();
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
          country: "wales",
          email: "yes",
          ask: "frontier-ai-letter",
          answer: "signed",
        },
      }),
    ).toEqual([]);
    expect(await filterProblems({ list: "politicians", params: { answer: "going" } })).toEqual([]);
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

  it("checks a supporters filter's events against those imported", async () => {
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('evt-1', 'Meet-up', 'https://lu.ma/a', now(), 'manage')`,
    );
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
          country: "scotland",
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
          within: "3",
        },
      }),
    ).toEqual([
      "activity=dancer",
      "contact=email:renamed-topic:yes",
      "event=evt-gone",
      "campaign=old-campaign",
      "wrote=maybe",
      "within=3",
    ]);
  });
});
