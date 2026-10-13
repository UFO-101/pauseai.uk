import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/content/email-your-mp";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

function lookup(body: unknown) {
  return POST(new Request("http://localhost/api/email-your-mp/lookup", { method: "POST", body: JSON.stringify(body) }));
}

describe("POST /api/email-your-mp/lookup", () => {
  it("returns the MP and their statuses", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    const res = await lookup({ postcode: "SW1A 1AA" });
    expect(await res.json()).toEqual({
      ok: true,
      mp: { name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: "rachel.blake.mp@parliament.uk" },
      statuses: {},
    });
  });

  it("explains a postcode it can't place", async () => {
    const res = await lookup({ postcode: "XX1 1XX" });
    expect(await res.json()).toEqual({ ok: false, message: copy.lookup.notFound });
  });

  it("needs a postcode", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
    expect((await lookup({ postcode: 5 })).status).toBe(400);
  });
});
