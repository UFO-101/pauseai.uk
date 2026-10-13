import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import type { Drawable } from "@/lib/collateral/templates";
import { useStudioAssets } from "./useStudioAssets";

// Failures and slow loads, which the real fonts and logos never give.
const { loads } = vi.hoisted(() => ({
  loads: { fonts: undefined as undefined | (() => Promise<void>), image: undefined as undefined | (() => Promise<Drawable>) },
}));
vi.mock("@/lib/collateral/render", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/collateral/render")>();
  return {
    ...actual,
    loadFonts: () => (loads.fonts ? loads.fonts() : actual.loadFonts()),
    loadImage: (src: string) => (loads.image ? loads.image() : actual.loadImage(src)),
  };
});

afterEach(() => {
  loads.fonts = undefined;
  loads.image = undefined;
});

describe("useStudioAssets when loading goes wrong", () => {
  it("carries on without fonts, and reports a logo that won't load", async () => {
    loads.fonts = () => Promise.reject(new Error("fonts"));
    loads.image = () => Promise.reject(new Error("logo"));
    const { result } = await renderHook(() => useStudioAssets());
    await expect.poll(() => result.current.fontsReady).toBe(true);
    await expect.poll(() => result.current.error).toBe("Could not load the logo.");
  });

  it("ignores loads that finish after it has gone", async () => {
    let fonts: () => void = () => {};
    const images: { ok: (d: Drawable) => void; fail: (e: Error) => void }[] = [];
    loads.fonts = () => new Promise((r) => (fonts = r));
    loads.image = () => new Promise((ok, fail) => images.push({ ok, fail }));
    const { unmount } = await renderHook(() => useStudioAssets());
    await unmount();
    fonts();
    images[0].ok({ source: document.createElement("canvas"), width: 1, height: 1 });
    images[1].fail(new Error("late"));
    await new Promise((r) => setTimeout(r, 10));
  });
});
