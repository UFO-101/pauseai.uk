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

  it("answers an Airtable write with a new record", async () => {
    expect((await fixtureResponse("https://eu.airtable.com/v0/app/tbl", { method: "POST" })!.json()).id).toBe("recFixtureLetter");
  });

  it("knows one postcode, and 404s the rest", async () => {
    const found = await fixtureResponse("https://api.postcodes.io/postcodes/sw1a%201aa")!.json();
    expect(found.result.parliamentary_constituency).toBe("Cities of London and Westminster");
    expect(fixtureResponse("https://api.postcodes.io/postcodes/XX11XX")!.status).toBe(404);
  });

  it("passes every Turnstile token", async () => {
    expect((await fixtureResponse("https://challenges.cloudflare.com/turnstile/v0/siteverify")!.json()).success).toBe(true);
  });

  it("lists two MPs, each with an office email", async () => {
    expect((await fixtureResponse("https://members-api.parliament.uk/api/Members/Search?House=1")!.json()).items).toHaveLength(2);
    const contact = await fixtureResponse("https://members-api.parliament.uk/api/Members/172/Contact")!.json();
    expect(contact.value[0].email).toBe("mp172.office@parliament.uk ");
  });

  it("has nothing for other URLs", () => {
    expect(fixtureResponse("https://api2.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://public-api.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://eu.airtable.com/other")).toBeUndefined();
    expect(fixtureResponse("https://members-api.parliament.uk/api/Members/172")).toBeUndefined();
    expect(fixtureResponse("https://example.com/")).toBeUndefined();
  });
});
