import { afterEach, describe, expect, it, vi } from "vitest";
import { shuffle } from "./shuffle";

afterEach(() => vi.restoreAllMocks());

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
});
