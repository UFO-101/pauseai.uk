import { describe, expect, it } from "vitest";
import { askSlug, asksDone } from "./asks";

describe("askSlug", () => {
  it("makes a slug of the title's letters and digits, then the date's month and year", () => {
    expect(askSlug("Go to Parliament", "2026-10-20")).toBe("go-to-parliament-oct-2026");
    expect(askSlug("  Réunion d'été! ", null)).toBe("reunion-d-ete");
    expect(askSlug("!!!", "2027-01-05")).toBe("ask-jan-2027");
  });
});

describe("asksDone", () => {
  it("counts the asks they signed, are going to, or are meeting our staff at, not those they're unsure of or declined", () => {
    const answers = { a: "signed", b: "going", c: "meeting_staff", d: "tentative", e: "declined" } as const;
    expect(asksDone(Object.fromEntries(Object.entries(answers).map(([ask, status]) => [ask, { status }])))).toBe(3);
    expect(asksDone({})).toBe(0);
  });
});
