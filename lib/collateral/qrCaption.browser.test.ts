import { afterEach, describe, expect, it, vi } from "vitest";
import { CAPTION_FONTS, captionFontCss } from "./qrCaption";

// The SVG download embeds the caption fonts, fetched from the site.
afterEach(() => vi.restoreAllMocks());

describe("captionFontCss", () => {
  it("inlines both caption fonts as base64 @font-face rules, fetching them once", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    const css = await captionFontCss();
    for (const { family, weightRange } of Object.values(CAPTION_FONTS)) {
      expect(css).toContain(`font-family:"${family}";font-weight:${weightRange};src:url(data:font/woff2;base64,`);
    }
    expect(css.length).toBeGreaterThan(10_000);
    expect(await captionFontCss()).toBe(css);
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(Object.keys(CAPTION_FONTS).length);
  });
});
