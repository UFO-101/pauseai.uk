import { afterEach, describe, expect, it, vi } from "vitest";
import { randomId } from "./random-id";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("randomId", () => {
  it("is random, and never asks for the seed, outside a fixture build", async () => {
    vi.stubEnv("DATA_FIXTURES", "");
    const seed = vi.fn(() => "seed");
    const [a, b] = [await randomId(12, seed), await randomId(12, seed)];
    expect(a).toHaveLength(12);
    expect(a.equals(b)).toBe(false);
    expect(seed).not.toHaveBeenCalled();
  });

  it("comes from the seed in a fixture build: the same for the same seed, and different for another", async () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    const a = await randomId(32, () => "one");
    expect(a).toHaveLength(32);
    expect(a.equals(await randomId(32, async () => "one"))).toBe(true);
    expect(a.equals(await randomId(32, () => "two"))).toBe(false);
    expect(await randomId(12, () => "one")).toEqual(a.subarray(0, 12));
  });
});
