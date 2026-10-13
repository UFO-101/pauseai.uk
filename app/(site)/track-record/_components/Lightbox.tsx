"use client";

import { useEffect } from "react";

/**
 * The photo lightbox, and the timeline's active-entry highlight.
 *
 * Gallery thumbnails (<Shot>, and the hand-written .shot links) are plain
 * links to the full photo, so they work without JavaScript. Once hydrated,
 * clicking one opens it here instead, with previous/next buttons and the
 * arrow and Escape keys.
 */
export default function Lightbox() {
  useEffect(() => {
    // Both are rendered below, so they are there once this runs.
    const lb = document.getElementById("lightbox")!;
    const lbImg = lb.querySelector<HTMLImageElement>(".lb-image")!;
    const shots = Array.from(document.querySelectorAll<HTMLAnchorElement>(".shot"));
    let idx = 0;

    const show = (i: number) => {
      idx = (i + shots.length) % shots.length;
      const a = shots[idx];
      lbImg.src = a.getAttribute("href")!;
      lbImg.alt = a.querySelector("img")?.alt || "";
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
    };
    const hide = () => {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      lbImg.removeAttribute("src");
    };

    const shotHandlers = shots.map((a, i) => {
      const handler = (e: MouseEvent) => {
        e.preventDefault();
        show(i);
      };
      a.addEventListener("click", handler);
      return handler;
    });
    const prev = () => show(idx - 1);
    const next = () => show(idx + 1);
    const onBackdrop = (e: MouseEvent) => {
      if (e.target === lb) hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    const btnClose = lb.querySelector(".lb-close")!;
    const btnPrev = lb.querySelector(".lb-prev")!;
    const btnNext = lb.querySelector(".lb-next")!;
    btnClose.addEventListener("click", hide);
    btnPrev.addEventListener("click", prev);
    btnNext.addEventListener("click", next);
    lb.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);

    // Highlight the timeline entry nearest the top of the screen.
    const entries = Array.from(document.querySelectorAll(".entry"));
    const setActive = (el: Element) => entries.forEach((entry) => entry.classList.toggle("is-active", entry === el));
    const io = new IntersectionObserver(
      (items) => {
        const visible = items
          .filter((item) => item.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );
    entries.forEach((entry) => io.observe(entry));
    if (entries[0]) setActive(entries[0]);

    return () => {
      shots.forEach((a, i) => a.removeEventListener("click", shotHandlers[i]));
      btnClose.removeEventListener("click", hide);
      btnPrev.removeEventListener("click", prev);
      btnNext.removeEventListener("click", next);
      lb.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      io.disconnect();
    };
  }, []);

  return (
    <div className="lightbox" id="lightbox" aria-hidden="true" role="dialog">
      <button className="lb-close" aria-label="Close">
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="lb-prev" aria-label="Previous">
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button className="lb-next" aria-label="Next">
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- src is set on open, to whichever full-size photo was clicked */}
      <img className="lb-image" alt="" />
    </div>
  );
}
