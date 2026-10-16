import { afterEach, describe, expect, it, vi } from "vitest";
import { now } from "./now";

afterEach(() => vi.unstubAllEnvs());

describe("now", () => {
  it("is the real time", () => {
    vi.stubEnv("FIXTURE_NOW", "");
    const before = Date.now();
    expect(now().getTime()).toBeGreaterThanOrEqual(before);
    expect(now().getTime()).toBeLessThan(before + 5_000);
  });

  it("is FIXTURE_NOW in a fixture build", () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-16T12:00:00.000Z");
    expect(now().toISOString()).toBe("2026-10-16T12:00:00.000Z");
  });
});
