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

  it("serves Airtable's MPs when asked for the House of Commons", async () => {
    const formula = encodeURIComponent("AND({Body}='House of Commons')");
    const mps = await fixtureResponse(`https://eu.airtable.com/v0/app/tbl?filterByFormula=${formula}`)!.json();
    expect(mps.records.map((r: { id: string }) => r.id)).toEqual(["recAbbott", "recBlake"]);
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

  it("accepts every email sent through Postmark", async () => {
    const sent = await fixtureResponse("https://api.postmarkapp.com/email")!.json();
    expect(sent.ErrorCode).toBe(0);
    expect(sent.MessageID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("has nothing for other URLs", () => {
    expect(fixtureResponse("https://api2.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://public-api.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://eu.airtable.com/other")).toBeUndefined();
    expect(fixtureResponse("https://members-api.parliament.uk/api/Members/172")).toBeUndefined();
    expect(fixtureResponse("https://example.com/")).toBeUndefined();
  });
});
