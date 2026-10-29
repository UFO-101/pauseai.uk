import { describe, expect, it } from "vitest";
import { askSlug } from "./asks";

describe("askSlug", () => {
  it("makes a slug of the title's letters and digits, then the date's month and year", () => {
    expect(askSlug("Go to Parliament", "2026-10-20")).toBe("go-to-parliament-oct-2026");
    expect(askSlug("  Réunion d'été! ", null)).toBe("reunion-d-ete");
    expect(askSlug("!!!", "2027-01-05")).toBe("ask-jan-2027");
  });
});
