"use client";

import { useEffect, useRef, useState } from "react";
import type { ThankedDonor } from "@/lib/server/outside-services/stripe";
import styles from "./DonateThanks.module.css";

/** How many donors fit in the window before it rolls. */
const LATEST = 5;

/** How fast the window rolls, in pixels a second. */
const SPEED = 14;

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

// Under the donate form: the donors who said yes to the wall of thanks at
// checkout, newest first, each with the day they gave. Once there are more
// than fit, the list rolls slowly upwards by itself, and stops at the oldest.
// Hovering or focusing it holds the roll; scrolling or dragging it stops the
// roll for good; asking for less motion stops it from the start. Nothing
// when there's nobody.
export default function DonateThanks({ donors }: { donors: ThankedDonor[] }) {
  const windowRef = useRef<HTMLDivElement>(null);
  const rolling = donors.length > LATEST;
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = windowRef.current;
    if (!el || !rolling) return;
    let pos = el.scrollTop;
    let held = false;
    let stopped = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let drag: { y: number; top: number } | null = null;
    // Timed by the clock, so a page whose clock is fixed, as the
    // storyboard's is, holds still.
    let last = Date.now();

    let frame = requestAnimationFrame(function tick() {
      const now = Date.now();
      if (!held && !stopped) {
        const end = el.scrollHeight - el.clientHeight;
        pos = Math.min(end, pos + (SPEED * (now - last)) / 1000);
        el.scrollTop = pos;
        stopped = pos >= end;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    });
    // A scroll that isn't the roll's own is the reader's (a wheel, a
    // finger, a drag), and stops the roll for good.
    const onScroll = () => {
      if (Math.abs(el.scrollTop - pos) > 1) stopped = true;
      pos = el.scrollTop;
    };
    // A mouse drags the list like a finger; touch scrolls it natively.
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      drag = { y: event.clientY, top: el.scrollTop };
      el.setPointerCapture(event.pointerId);
      setDragging(true);
    };
    const onMove = (event: PointerEvent) => {
      if (drag) el.scrollTop = drag.top - (event.clientY - drag.y);
    };
    const onUp = () => {
      drag = null;
      setDragging(false);
    };
    const hold = () => (held = true);
    const release = () => (held = false);
    const listeners: [string, EventListener][] = [
      ["scroll", onScroll],
      ["pointerdown", onDown as EventListener],
      ["pointermove", onMove as EventListener],
      ["pointerup", onUp],
      ["pointercancel", onUp],
      ["pointerenter", hold],
      ["pointerleave", release],
      ["focusin", hold],
      ["focusout", release],
    ];
    for (const [type, listener] of listeners) el.addEventListener(type, listener);
    return () => {
      cancelAnimationFrame(frame);
      for (const [type, listener] of listeners) el.removeEventListener(type, listener);
    };
  }, [rolling]);

  if (donors.length === 0) return null;
  return (
    <section className={styles.thanks} aria-labelledby="donate-thanks">
      <h2 id="donate-thanks" className={styles.heading}>
        <span className={styles.sparkle} aria-hidden="true">
          ✦
        </span>
        Thank you to our latest donors!
        <span className={styles.sparkle} aria-hidden="true">
          ✦
        </span>
      </h2>
      <div
        ref={windowRef}
        className={[styles.window, rolling && styles.rolling, dragging && styles.dragging].filter(Boolean).join(" ")}
      >
        <ul className={styles.list}>
          {donors.map((donor) => (
            <li key={`${donor.name} ${donor.givenAt}`} className={styles.donor}>
              <span className={styles.name}>{donor.name}</span>
              <time className={styles.when} dateTime={donor.givenAt}>
                {DAY.format(new Date(donor.givenAt))}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
