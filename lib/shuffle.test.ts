import { afterEach, describe, expect, it, vi } from "vitest";
import { seededRandom, shuffle } from "./shuffle";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("shuffle", () => {
  it("returns a new array with the same items", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("swaps each position with a random earlier one (Fisher–Yates)", () => {
    // random() of 0 always picks index 0, rotating the first item to the end.
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffle(["a", "b", "c", "d"])).toEqual(["b", "c", "d", "a"]);
  });

  it("leaves the order alone when every pick is the item itself", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(shuffle(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("copes with empty and single-item lists", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["only"])).toEqual(["only"]);
  });

  it("gives the same order every time in a fixture build, without Math.random", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    const random = vi.spyOn(Math, "random");
    const items = Array.from({ length: 20 }, (_, i) => i);
    const first = shuffle(items);
    expect(shuffle(items)).toEqual(first);
    expect(first).not.toEqual(items);
    expect(random).not.toHaveBeenCalled();
  });
});

describe("seededRandom", () => {
  it("is a repeatable sequence in [0, 1) that differs by seed", () => {
    const a = seededRandom(1);
    const b = seededRandom(1);
    const values = Array.from({ length: 100 }, () => a());
    expect(Array.from({ length: 100 }, () => b())).toEqual(values);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(90);
    expect(seededRandom(2)()).not.toBe(values[0]);
  });
});
