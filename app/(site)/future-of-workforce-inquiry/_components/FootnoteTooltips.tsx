"use client";

import { useEffect } from "react";

/**
 * Hovering a footnote marker (<sup>3</sup>) shows that note (the
 * <li id="fn3"> in the Notes list) in a tooltip beside it. Without
 * JavaScript, or on touch, readers scroll to the notes as before.
 */
export default function FootnoteTooltips() {
  useEffect(() => {
    const tip = document.createElement("div");
    tip.className = "fn-tooltip";
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const reposition = (sup: Element) => {
      const supRect = sup.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const { scrollX, scrollY } = window;
      let left = supRect.left + supRect.width / 2 - tipRect.width / 2 + scrollX;
      let top = supRect.top - tipRect.height - 10 + scrollY;
      // No room above: show it below the marker instead.
      if (supRect.top < tipRect.height + 20) top = supRect.bottom + 8 + scrollY;
      const maxLeft = window.innerWidth - tipRect.width - 12 + scrollX;
      left = Math.max(12 + scrollX, Math.min(left, maxLeft));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };

    const note = (sup: Element) => document.getElementById(`fn${sup.textContent!.trim()}`);

    const show = (sup: Element, fn: Element) => {
      clearTimeout(hideTimer);
      tip.innerHTML = fn.innerHTML;
      tip.classList.add("fn-tooltip--visible");
      reposition(sup);
    };
    const hide = () => {
      hideTimer = setTimeout(() => tip.classList.remove("fn-tooltip--visible"), 150);
    };
    const keep = () => clearTimeout(hideTimer);

    // Only markers with a note get a tooltip.
    const notes = Array.from(document.querySelectorAll("sup")).flatMap((sup) => {
      const fn = note(sup);
      return fn ? [{ sup, fn }] : [];
    });
    const refs = notes.map((n) => n.sup);
    const handlers = notes.map(({ sup, fn }) => {
      sup.classList.add("fn-ref");
      const enter = () => show(sup, fn);
      sup.addEventListener("mouseenter", enter);
      sup.addEventListener("mouseleave", hide);
      return enter;
    });
    tip.addEventListener("mouseenter", keep);
    tip.addEventListener("mouseleave", hide);

    return () => {
      clearTimeout(hideTimer);
      refs.forEach((sup, i) => {
        sup.removeEventListener("mouseenter", handlers[i]);
        sup.removeEventListener("mouseleave", hide);
      });
      tip.remove();
    };
  }, []);

  return null;
}
