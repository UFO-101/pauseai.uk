import { describe, expect, it } from "vitest";
import { phoneSearch } from "./search";

describe("phoneSearch", () => {
  it("writes a number, or its start, as phone_number() stores them", () => {
    expect(phoneSearch("07700 900001")).toBe("+447700900001");
    expect(phoneSearch("(07700) 900-001")).toBe("+447700900001");
    expect(phoneSearch("+44 (0)7700 900001")).toBe("+447700900001");
    expect(phoneSearch("0044 7700")).toBe("+447700");
    expect(phoneSearch("+33 1 23")).toBe("+33123");
    // The middle of a number is searched for as it's typed.
    expect(phoneSearch("900 001")).toBe("900001");
  });

  it("isn't a number for words, or too few digits", () => {
    expect(phoneSearch("jane")).toBeUndefined();
    expect(phoneSearch("077")).toBeUndefined();
    expect(phoneSearch("0770 jane")).toBeUndefined();
  });
});
