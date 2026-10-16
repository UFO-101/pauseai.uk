"use client";

import { useEffect } from "react";

// Sets --copy-shift on each marquee track (data-marquee-track, its first
// copy data-marquee-copy) and marks the hero's images data-loaded once
// they're actually painted. Runs as a React effect (after hydration)
// rather than a raw inline <script> so it can't mutate the DOM before
// React finishes hydrating and cause a hydration mismatch.
export default function HeroMarqueeEffects() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    document.querySelectorAll<HTMLElement>("[data-marquee-track]").forEach((track) => {
      const copy = track.querySelector<HTMLElement>("[data-marquee-copy]");
      if (!copy) return;

      function update() {
        const w = copy!.getBoundingClientRect().width;
        if (w > 0) track.style.setProperty("--copy-shift", `-${w}px`);
      }
      update();

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(update);
        observer.observe(copy);
        cleanups.push(() => observer.disconnect());
      } else {
        window.addEventListener("resize", update);
        cleanups.push(() => window.removeEventListener("resize", update));
      }

      if (document.fonts?.ready) {
        document.fonts.ready.then(update);
      }

      copy.querySelectorAll("img").forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", update, { once: true });
        }
      });
    });

    document.querySelectorAll<HTMLImageElement>('[data-marquee-track="hero"] img').forEach((img) => {
      function mark() {
        img.dataset.loaded = "";
      }
      if (img.complete && img.naturalWidth > 0) {
        mark();
      } else {
        img.addEventListener("load", mark, { once: true });
        img.addEventListener("error", mark, { once: true });
      }
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
