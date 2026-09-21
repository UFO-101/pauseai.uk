import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { BRAND_ORANGE, contrastRatio, getTheme, THEMES } from "./themes";

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

describe("theme logos", () => {
  it.each(THEMES)("$id logo file exists in public/", (theme) => {
    expect(existsSync(join(process.cwd(), "public", theme.logoSrc))).toBe(true);
  });
});

describe("brand orange", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), "public/images/logos", file), "utf8").toUpperCase();

  // The collateral tools take their orange from the logo, so they must not drift apart.
  it("is the orange used in the logo files", () => {
    expect(read("PauseAI-Logo-Orange-Black-Logo-Transparent.svg")).toContain(`FILL="${BRAND_ORANGE.toUpperCase()}"`);
    expect(read("Pause-Symbol.svg")).toContain(`FILL="${BRAND_ORANGE.toUpperCase()}"`);
    expect(read("collateral/logo-color-on-light.svg")).toContain(`FILL="${BRAND_ORANGE.toUpperCase()}"`);
  });

  it("is the button colour on every style that has an orange button", () => {
    for (const theme of THEMES.filter((t) => t.id !== "orange")) {
      expect(theme.accent.toUpperCase()).toBe(BRAND_ORANGE.toUpperCase());
    }
  });
});
