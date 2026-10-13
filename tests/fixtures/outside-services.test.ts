import { describe, expect, it } from "vitest";
import { fixtureResponse } from "./outside-services";

describe("fixtureResponse", () => {
  it("serves the future and past calendars by period", async () => {
    const future = await fixtureResponse("https://api2.luma.com/calendar/get-items?period=future")!.json();
    const past = await fixtureResponse("https://api2.luma.com/calendar/get-items?period=past")!.json();
    expect(future.entries[0].event.url).toBe("fixture-london-protest");
    expect(past.entries[0].event.url).toBe("fixture-past-london-march");
  });

  it("serves the guest list and Airtable", async () => {
    expect((await fixtureResponse("https://public-api.luma.com/v1/event/get-guests?x=1")!.json()).has_more).toBe(false);
    expect((await fixtureResponse("https://eu.airtable.com/v0/app/tbl")!.json()).records).toHaveLength(2);
  });

  it("has nothing for other URLs", () => {
    expect(fixtureResponse("https://api2.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://public-api.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://eu.airtable.com/other")).toBeUndefined();
    expect(fixtureResponse("https://example.com/")).toBeUndefined();
  });
});
