import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { statusesFor } from "./mp-status";

const MP = { name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: "rachel.blake.mp@parliament.uk" };
// Airtable's API, matched without naming its host, which only lib/server/airtable.ts may do.
const AIRTABLE = "https://*.airtable.com/v0/*";

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("statusesFor", () => {
  it("reads whether the MP signed from Airtable", async () => {
    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [{ id: "rec1", fields: { "Signed Frontier AI Letter": true } }] })));
    expect(await statusesFor(MP)).toEqual({ "letter-to-the-prime-minister": "signed" });
  });

  it("has nothing to say without Airtable, an email, or a record", async () => {
    server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: [] })));
    expect(await statusesFor(MP)).toEqual({});
    expect(await statusesFor({ ...MP, email: null })).toEqual({});
    vi.stubEnv("AIRTABLE_TOKEN", "");
    expect(await statusesFor(MP)).toEqual({});
  });

  it("carries on if Airtable fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.get(AIRTABLE, () => new HttpResponse(null, { status: 500 })));
    expect(await statusesFor(MP)).toEqual({});
  });
});
