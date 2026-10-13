"use client";

import { useEffect, useState } from "react";
import { loadFonts, loadImage } from "@/lib/collateral/render";
import type { Drawable } from "@/lib/collateral/templates";
import { THEMES } from "@/lib/collateral/themes";

/** Canvas fonts and every style's logo variant, loaded once, so switching styles (or drawing several at once) is instant. */
export function useStudioAssets() {
  const [fontsReady, setFontsReady] = useState(false);
  const [logos, setLogos] = useState<Record<string, Drawable>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFonts()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setFontsReady(true);
      });
    for (const src of new Set(THEMES.map((t) => t.logoSrc))) {
      loadImage(src)
        .then((img) => {
          if (!cancelled) setLogos((prev) => ({ ...prev, [src]: img }));
        })
        .catch(() => {
          if (!cancelled) setError("Could not load the logo.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { fontsReady, logos, error };
}
