"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollInit() {
  // Re-run per route so a client-side navigation to a hashed URL gets the
  // same post-layout correction below that a cold load does.
  const pathname = usePathname();

  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

    // Fragment links themselves are left entirely to the browser: smooth
    // scrolling comes from `scroll-behavior` in globals.css, the offset for
    // the sticky nav from `scroll-margin-top`. This only corrects the
    // landing position when late layout shift (font swap, an image above
    // the target) moves the target after the browser has already scrolled.
    if (window.location.hash) {
      try {
        const target = document.querySelector(window.location.hash);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } catch {
        // Malformed hash (e.g. a query string appended after it) — not a valid selector.
      }
    }
  }, [pathname]);

  return null;
}
