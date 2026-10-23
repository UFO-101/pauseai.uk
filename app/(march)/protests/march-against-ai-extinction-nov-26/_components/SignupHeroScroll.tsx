"use client";

import { useEffect, useRef } from "react";
import { m } from "./classes";
import { useSignupHero } from "./MarchSignupFrame";

/** How long the glide past the hero takes, in ms. */
const DURATION = 1000;
/* A wheel gesture counts as over after this long without events. Until then,
   trackpad momentum is swallowed so it can't carry on past the landing point. */
const QUIET = 200;

const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Where the hero ends, in the page's coordinates. */
const heroEnd = (hero: HTMLElement | null) => (hero ? hero.offsetTop + hero.offsetHeight : 0);

/*
 * Makes the hero behave as a page of its own: the first scroll down from it
 * glides to the next band, and scrolling up into it glides back to the top.
 * The rest of the page scrolls normally. Wheel and keyboard only; touch
 * scrolling is left native. Renders the scroll cue at the hero's foot, so it
 * sits inside the hero.
 */
export default function SignupHeroScroll() {
  const { hero } = useSignupHero();
  const glideRef = useRef<((to: number) => void) | null>(null);

  useEffect(() => {
    if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let gliding = false;
    let locked = false;
    let lastWheel = 0;

    // Where to glide to, or null to let the browser scroll.
    const target = (down: boolean) => {
      const end = heroEnd(hero);
      // A hero taller than the window: gliding would skip some of it.
      if (hero.offsetHeight > innerHeight + 1) return null;
      if (down && scrollY < end - 1) return end;
      if (!down && scrollY > 0 && scrollY <= end + 1) return 0;
      return null;
    };

    const glide = (to: number) => {
      gliding = locked = true;
      const from = scrollY;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / DURATION, 1);
        scrollTo({ top: from + (to - from) * ease(t), behavior: "instant" });
        if (t < 1) requestAnimationFrame(step);
        else gliding = false;
      };
      requestAnimationFrame(step);
    };
    glideRef.current = glide;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (locked) {
        if (gliding || gap < QUIET) return e.preventDefault();
        locked = false;
      }
      const to = target(e.deltaY > 0);
      if (to === null) return;
      e.preventDefault();
      glide(to);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, button, [contenteditable]")) return;
      const space = e.key === " ";
      const down = e.key === "PageDown" || e.key === "ArrowDown" || (space && !e.shiftKey);
      const up = e.key === "PageUp" || e.key === "ArrowUp" || (space && e.shiftKey);
      if (!down && !up) return;
      if (gliding) return e.preventDefault();
      const to = target(down);
      if (to === null) return;
      e.preventDefault();
      glide(to);
    };

    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      glideRef.current = null;
    };
  }, [hero]);

  // With reduced motion there's no glide, so the cue uses the browser's own
  // scroll, which is then instant.
  return (
    <button
      type="button"
      className={m("hero-scroll")}
      aria-label="Scroll down"
      onClick={() => (glideRef.current ? glideRef.current(heroEnd(hero)) : scrollTo({ top: heroEnd(hero) }))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
      </svg>
    </button>
  );
}
