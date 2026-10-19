import { describe, expect, it } from "vitest";
import { fixtureResponse } from "./outside-services";

describe("fixtureResponse", () => {
  it("serves the future and past calendars by period", async () => {
    const future = await fixtureResponse(
      "https://public-api.luma.com/v1/calendars/events/list?after=2026-01-01T00:00:00.000Z",
    )!.json();
    const past = await fixtureResponse(
      "https://public-api.luma.com/v1/calendars/events/list?before=2026-01-01T00:00:00.000Z",
    )!.json();
    expect(future.entries[0].url).toBe("https://luma.com/fixture-london-protest");
    expect(past.entries[0].url).toBe("https://luma.com/fixture-past-london-march");
  });

  it("serves the guest list and Airtable", async () => {
    expect((await fixtureResponse("https://public-api.luma.com/v1/event/get-guests?x=1")!.json()).has_more).toBe(false);
    expect((await fixtureResponse("https://eu.airtable.com/v0/app/tbl")!.json()).records).toHaveLength(2);
  });

  it("serves Airtable's MPs when asked for the House of Commons", async () => {
    const formula = encodeURIComponent("AND({Body}='House of Commons')");
    const mps = await fixtureResponse(`https://eu.airtable.com/v0/app/tbl?filterByFormula=${formula}`)!.json();
    expect(mps.records.map((r: { id: string }) => r.id)).toEqual(["recDummy", "recPlaceholder"]);
  });

  it("knows one postcode, and 404s the rest", async () => {
    const found = await fixtureResponse("https://api.postcodes.io/postcodes/sw1a%201aa")!.json();
    expect(found.result.parliamentary_constituency).toBe("Cities of London and Westminster");
    expect(fixtureResponse("https://api.postcodes.io/postcodes/XX11XX")!.status).toBe(404);
  });

  it("passes every Turnstile token", async () => {
    expect((await fixtureResponse("https://challenges.cloudflare.com/turnstile/v0/siteverify")!.json()).success).toBe(
      true,
    );
  });

  it("lists two MPs, each with an office email", async () => {
    expect(
      (await fixtureResponse("https://members-api.parliament.uk/api/Members/Search?House=1")!.json()).items,
    ).toHaveLength(2);
    const contact = await fixtureResponse("https://members-api.parliament.uk/api/Members/90001/Contact")!.json();
    expect(contact.value[0].email).toBe("mp90001.office@parliament.uk ");
  });

  it("accepts every email sent through Postmark", async () => {
    const sent = await fixtureResponse("https://api.postmarkapp.com/email")!.json();
    expect(sent.ErrorCode).toBe(0);
    expect(sent.MessageID).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("gives the same email the same MessageID every time, and another email a different one", async () => {
    const id = async (body: string) =>
      (await fixtureResponse("https://api.postmarkapp.com/email", { method: "POST", body })!.json()).MessageID;
    expect(await id("a letter")).toBe(await id("a letter"));
    expect(await id("a letter")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await id("another")).not.toBe(await id("a letter"));
    // A letter's address's random digits don't change it.
    expect(await id("From: jane.smith.482913@letters.pauseai.uk")).toBe(
      await id("From: jane.smith.055350@letters.pauseai.uk"),
    );
  });

  it("has nothing for other URLs", () => {
    expect(fixtureResponse("https://public-api.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://eu.airtable.com/other")).toBeUndefined();
    expect(fixtureResponse("https://members-api.parliament.uk/api/Members/90001")).toBeUndefined();
    expect(fixtureResponse("https://example.com/")).toBeUndefined();
  });
});
