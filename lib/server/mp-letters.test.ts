import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { parseLetterForm, submitLetter, type LetterForm } from "./mp-letters";

// Airtable's API, matched without naming its host, which only lib/server/airtable.ts may do.
const AIRTABLE = "https://*.airtable.com/v0/*";

const FORM: LetterForm = {
  campaign: "letter-to-the-prime-minister",
  name: "Jane Smith",
  postcode: "sw1a 1aa",
  email: "jane@example.com",
  subject: "Subject",
  letter: "Dear Ms Blake,\n\nPlease sign.\n\nThanks,",
  consent: true,
  nickname: "",
  turnstileToken: "token",
};

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("AIRTABLE_TOKEN", "read");
  vi.stubEnv("AIRTABLE_WRITE_API_KEY", "write");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Records the letters posted to Airtable. */
function letters() {
  const posted: { fields: Record<string, unknown> }[] = [];
  server.use(
    http.post(AIRTABLE, async ({ request }) => {
      posted.push((await request.json()) as (typeof posted)[number]);
      return HttpResponse.json({ id: "recLetter" });
    }),
  );
  return posted;
}

describe("parseLetterForm", () => {
  it("trims strings, and treats anything else as empty", () => {
    expect(parseLetterForm({ name: " Jane ", consent: true, email: 5 })).toEqual({
      campaign: "",
      name: "Jane",
      postcode: "",
      email: "",
      subject: "",
      letter: "",
      consent: true,
      nickname: "",
      turnstileToken: "",
    });
    expect(parseLetterForm(null).consent).toBe(false);
  });
});

describe("submitLetter", () => {
  it("adds the letter to Airtable for the MP the postcode finds, signed with name and postcode", async () => {
    const posted = letters();

    expect(await submitLetter(FORM, "localhost")).toEqual({ ok: true });

    expect(posted).toHaveLength(1);
    expect(posted[0].fields).toMatchObject({
      "Sender email": "jane@example.com",
      "Sender postcode": "SW1A 1AA",
      Recipient: ["recFixture1"],
      Campaign: "Frontier AI letter",
      Message: "Dear Ms Blake,\n\nPlease sign.\n\nThanks,\n\nJane Smith\nSW1A 1AA",
    });
  });

  it("names the bill campaign for Airtable", async () => {
    const posted = letters();
    await submitLetter({ ...FORM, campaign: "support-the-bill" }, "localhost");
    expect(posted[0].fields.Campaign).toBe("Alex Sobel bill");
  });

  it("pretends to accept a bot's letter, and saves nothing", async () => {
    const posted = letters();
    expect(await submitLetter({ ...FORM, nickname: "bot" }, "localhost")).toEqual({ ok: true });
    expect(posted).toEqual([]);
  });

  it("refuses a letter that fails the spam check", async () => {
    expect(await submitLetter({ ...FORM, turnstileToken: "" }, "localhost")).toEqual({ ok: false, status: 403, message: copy.errors.spamWait });
  });

  it("refuses missing fields, a bad email, and an unknown campaign", async () => {
    expect(await submitLetter({ ...FORM, letter: "" }, "localhost")).toMatchObject({ status: 400, message: copy.errors.missingFields });
    expect(await submitLetter({ ...FORM, email: "jane" }, "localhost")).toMatchObject({ status: 400, message: copy.errors.invalidEmail });
    expect(await submitLetter({ ...FORM, campaign: "nope" }, "localhost")).toMatchObject({ status: 400, message: copy.errors.unknownCampaign });
  });

  it("refuses a postcode with no MP, or an MP with no email", async () => {
    expect(await submitLetter({ ...FORM, postcode: "XX1 1XX" }, "localhost")).toMatchObject({ status: 400, message: copy.errors.noRecipient });
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect(await submitLetter({ ...FORM, postcode: "ZZ99ZZ" }, "localhost")).toMatchObject({ status: 400, message: copy.errors.noRecipient });
  });

  it("fails without Airtable keys, or without the MP's Airtable record", async () => {
    vi.stubEnv("AIRTABLE_WRITE_API_KEY", "");
    expect(await submitLetter(FORM, "localhost")).toMatchObject({ status: 500, message: copy.errors.failed });
    vi.stubEnv("AIRTABLE_WRITE_API_KEY", "write");
    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [] })));
    expect(await submitLetter(FORM, "localhost")).toMatchObject({ status: 500, message: copy.errors.failed });
  });

  it("fails when Airtable won't save it", async () => {
    server.use(http.post(AIRTABLE, () => new HttpResponse(null, { status: 500 })));
    expect(await submitLetter(FORM, "localhost")).toMatchObject({ status: 500, message: copy.errors.failed });
  });
});
