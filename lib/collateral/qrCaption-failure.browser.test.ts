import { describe, expect, it, vi } from "vitest";
import { captionFontCss } from "./qrCaption";

// A separate file, so the font CSS isn't already cached from a successful load.
describe("captionFontCss when a font can't be fetched", () => {
  it("fails, and tries again on the next call", async () => {
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(captionFontCss()).rejects.toThrow(/Could not load \/fonts\//);
    fetchSpy.mockRestore();
    await expect(captionFontCss()).resolves.toContain("@font-face");
  });
});
