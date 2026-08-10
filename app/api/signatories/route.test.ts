import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AirtableRequestError } from "@/lib/airtable";
import { GET } from "./route";

const ORIGINAL_TOKEN = process.env.AIRTABLE_TOKEN;

const { fetchFrontierLetterSignatoriesMock } = vi.hoisted(() => ({
  fetchFrontierLetterSignatoriesMock: vi.fn(),
}));

vi.mock("@/lib/airtable", async () => {
  const actual = await vi.importActual<typeof import("@/lib/airtable")>("@/lib/airtable");
  return {
    ...actual,
    fetchFrontierLetterSignatories: fetchFrontierLetterSignatoriesMock,
  };
});

describe("GET /api/signatories", () => {
  beforeEach(() => {
    process.env.AIRTABLE_TOKEN = "test-token";
    fetchFrontierLetterSignatoriesMock.mockReset();
  });

  afterEach(() => {
    process.env.AIRTABLE_TOKEN = ORIGINAL_TOKEN;
  });

  it("returns 500 and never calls Airtable when AIRTABLE_TOKEN is unset", async () => {
    delete process.env.AIRTABLE_TOKEN;

    const res = await GET();

    expect(res.status).toBe(500);
    expect(fetchFrontierLetterSignatoriesMock).not.toHaveBeenCalled();
  });

  it("returns the signatories from lib/airtable with a cache header", async () => {
    fetchFrontierLetterSignatoriesMock.mockResolvedValue([
      { name: "Jane MP", party: "Independent", constituency: "Somewhere" },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(fetchFrontierLetterSignatoriesMock).toHaveBeenCalledWith("test-token");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(body).toEqual([{ name: "Jane MP", party: "Independent", constituency: "Somewhere" }]);
  });

  it("returns 502 when lib/airtable throws AirtableRequestError", async () => {
    fetchFrontierLetterSignatoriesMock.mockRejectedValue(new AirtableRequestError("boom"));

    const res = await GET();

    expect(res.status).toBe(502);
  });
});
