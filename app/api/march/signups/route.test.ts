import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/march/signups", () => {
  it("answers with the march's count, for a CDN to keep for a minute", async () => {
    vi.stubEnv("LUMA_API_KEY", "k");
    const res = await GET();
    expect(await res.json()).toEqual({ count: 1234 });
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=60");
  });

  it("answers null when Luma can't say", async () => {
    vi.stubEnv("LUMA_API_KEY", "");
    expect(await (await GET()).json()).toEqual({ count: null });
  });
});
