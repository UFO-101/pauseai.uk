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

  it("serves every event, public or not, when asked for neither period", async () => {
    const all = await fixtureResponse("https://public-api.luma.com/v1/calendars/events/list?x=1")!.json();
    expect(all.entries.map((e: { visibility: string }) => e.visibility)).toContain("private");
    expect(all.entries.length).toBeGreaterThan(8);
  });

  it("serves an event's guests over two pages, with IDs of their own, and the contacts", async () => {
    const guests = "https://public-api.luma.com/v1/events/guests/list?event_id=evt-1";
    const first = await fixtureResponse(guests)!.json();
    expect(first.entries.map((g: { id: string }) => g.id)).toEqual(["gst-1-evt-1", "gst-2-evt-1", "gst-3-evt-1"]);
    expect(first.has_more).toBe(true);
    const second = await fixtureResponse(`${guests}&pagination_cursor=${first.next_cursor}`)!.json();
    expect(second.entries).toHaveLength(2);
    expect(second.has_more).toBe(false);
    const noEvent = await fixtureResponse("https://public-api.luma.com/v1/events/guests/list")!.json();
    expect(noEvent.entries[0].id).toBe("gst-1-");
    const contacts = await fixtureResponse("https://public-api.luma.com/v1/calendars/contacts/list?x=1")!.json();
    expect(contacts.entries).toHaveLength(2);
    expect(contacts.has_more).toBe(true);
  });

  it("serves each of the UK Parliamentarians base's tables, and nothing for another", async () => {
    const records = async (table: string) =>
      (await fixtureResponse(`https://eu.airtable.com/v0/appBInVvIm6opJ1Ob/${table}?x=1`)!.json()).records.map(
        (r: { id: string }) => r.id,
      );
    expect(await records("tblH3ks9wqQHLpYx3")).toContain("recPlaceholder");
    expect(await records("tblp4nH5Jymq48rcm")).toContain("recEmailCsrb");
    expect(await records("tblkzjrRHiZiqMDGR")).toContain("recWebDee");
    expect(await records("tblminXS1xSuBbEjz")).toContain("recGuest1");
    expect(fixtureResponse("https://eu.airtable.com/v0/appBInVvIm6opJ1Ob/tblOther")).toBeUndefined();
  });

  it("serves Airtable's members from the members table", async () => {
    const members = await fixtureResponse(
      "https://api.airtable.com/v0/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o?x=1",
    )!.json();
    expect(members.records[0].id).toBe("recMemberJane");
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

  it("takes any address off a Postmark stream's suppression list", async () => {
    const body = JSON.stringify({ Suppressions: [{ EmailAddress: "a@example.org" }] });
    const answer = fixtureResponse("https://api.postmarkapp.com/message-streams/outbound/suppressions/delete", {
      method: "POST",
      body,
    });
    expect(await answer!.json()).toEqual({
      Suppressions: [{ EmailAddress: "a@example.org", Status: "Deleted", Message: null }],
    });
  });

  it("has nothing for other URLs", () => {
    expect(fixtureResponse("https://public-api.luma.com/other")).toBeUndefined();
    expect(fixtureResponse("https://eu.airtable.com/other")).toBeUndefined();
    expect(fixtureResponse("https://members-api.parliament.uk/api/Members/90001")).toBeUndefined();
    expect(fixtureResponse("https://example.com/")).toBeUndefined();
  });
});
