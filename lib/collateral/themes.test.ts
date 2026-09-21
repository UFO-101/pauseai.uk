import { describe, expect, it } from "vitest";
import { contrastRatio, getTheme, THEMES } from "./themes";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FF9416", "#FF9416")).toBeCloseTo(1, 5);
  });
});

describe.each(THEMES)("theme $id", (theme) => {
  it("has AA contrast for body text on the background", () => {
    expect(contrastRatio(theme.text, theme.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(theme.muted, theme.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("has AA contrast for accent text on the background", () => {
    expect(contrastRatio(theme.accentText, theme.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("has AA contrast for text inside the accent pill", () => {
    expect(contrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("getTheme", () => {
  it("falls back to orange", () => {
    expect(getTheme("nope").id).toBe("orange");
  });
});
