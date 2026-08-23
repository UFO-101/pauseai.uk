"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollInit() {
  // Re-run per route: Next navigations swap the page content client-side,
  // so anything snapshotted at first load (section lists, per-anchor
  // listeners) goes stale and starts acting on detached nodes — which is
  // how scrolling /track-record used to stamp the homepage's last section
  // id into the URL.
  const pathname = usePathname();

  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

    // Delegated so it also covers anchors rendered after this effect runs.
    const handleAnchorClick = (e: MouseEvent) => {
      // Let modifier-clicks (open in new tab/window) through untouched.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      let target: Element | null;
      try {
        target = document.querySelector(targetId);
      } catch {
        // Malformed selector (e.g. a query string appended after the hash).
        return;
      }
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.pushState(null, "", targetId);
    };
    document.addEventListener("click", handleAnchorClick);

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

    let scrollTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Query live on every pass — the set of sections changes per page.
        const sections = document.querySelectorAll<HTMLElement>("section[id]");
        let current = "";
        for (const section of sections) {
          const top = section.getBoundingClientRect().top;
          if (top <= 120) current = section.id;
        }
        const hash = current ? `#${current}` : "";
        if (hash && window.location.hash !== hash) {
          history.replaceState(null, "", hash);
        } else if (!current && window.location.hash) {
          history.replaceState(null, "", window.location.pathname);
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [pathname]);

  return null;
}
