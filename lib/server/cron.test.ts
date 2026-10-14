import { afterEach, describe, expect, it, vi } from "vitest";
import { isCronRequest } from "./cron";

afterEach(() => vi.unstubAllEnvs());

const request = (authorization?: string) => new Request("https://pauseai.uk/api/cron/x", { headers: authorization ? { authorization } : {} });

describe("isCronRequest", () => {
  it("accepts only the right bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isCronRequest(request("Bearer s3cret"))).toBe(true);
    expect(isCronRequest(request("Bearer s3cres"))).toBe(false);
    expect(isCronRequest(request("Bearer s3"))).toBe(false);
    expect(isCronRequest(request())).toBe(false);
  });

  it("accepts nothing without CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronRequest(request("Bearer "))).toBe(false);
  });
});
