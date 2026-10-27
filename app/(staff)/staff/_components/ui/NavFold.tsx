"use client";

import { useSyncExternalStore } from "react";
import { staffCopy } from "@/lib/content/staff-interface";
import { NAV_FOLD_KEY } from "@/lib/staff-nav";
import styles from "./NavFold.module.css";

/** Tells this page's NavFold the sidebar has folded or unfolded. */
const EVENT = "staff-nav-fold";

const subscribe = (change: () => void) => {
  window.addEventListener(EVENT, change);
  return () => window.removeEventListener(EVENT, change);
};
const isFolded = () => document.documentElement.dataset.staffNav === "folded";

/**
 * The button at the foot of the staff sidebar that folds it to a rail of
 * icons, and unfolds it: on <html>, and remembered in this browser
 * (lib/staff-nav.ts). A chevron, and Fold beside it while it's open. Wider
 * screens only; a phone has the bar instead.
 */
export default function NavFold() {
  const folded = useSyncExternalStore(subscribe, isFolded, () => false);
  const toggle = () => {
    const root = document.documentElement;
    if (folded) delete root.dataset.staffNav;
    else root.dataset.staffNav = "folded";
    try {
      if (folded) localStorage.removeItem(NAV_FOLD_KEY);
      else localStorage.setItem(NAV_FOLD_KEY, "folded");
    } catch {
      // A browser that won't store it folds this page only.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <button
      type="button"
      className={styles.fold}
      aria-expanded={!folded}
      aria-label={folded ? staffCopy.nav.unfold : staffCopy.nav.fold}
      onClick={toggle}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.chevron}
      >
        <path d="M15 6l-6 6 6 6" />
      </svg>
      <span className={styles.text} aria-hidden="true">
        {staffCopy.nav.foldShort}
      </span>
    </button>
  );
}
