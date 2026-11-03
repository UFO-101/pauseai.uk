"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import styles from "./Bubble.module.css";
import { bubbleTrigger } from "./bubble-trigger";

/** How far from the window's edges a bubble opening is scrolled to be. */
const SCROLL_MARGIN = 16;

/** Room kept above a bubble for its button, with nothing to keep in view: a staff button's height, and the gap. */
const BUTTON_ROOM = 56;

/**
 * A bubble that a button opens, for a form or a few words on the thing
 * beside it (docs/style-guide.md, "Staff pages"): a popover, so a click
 * elsewhere, or Escape, closes it. Where the browser can anchor it, it
 * hangs under its button, centred on it but kept inside the window's
 * margins, with a pointer always up to the button's middle; elsewhere it
 * sits in the middle of the window, with none. `className` is for its
 * width alone (--bubble-width), never its look, or to open it under
 * something else than its button (--bubble-under, an anchor's name), its
 * pointer still at the button's middle: a row that should stay in view.
 * Opening where there's no room under it, the page scrolls as far as it
 * needs to show it whole, but no further than keeps `keep` in view, or
 * room above it for its button. `ref` is the bubble, to open it from a script.
 */
export function BubbleBox({
  id,
  className,
  ref,
  keep,
  children,
}: {
  id: string;
  className?: string;
  ref?: RefObject<HTMLDivElement | null>;
  keep?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const own = useRef<HTMLDivElement>(null);
  const box = ref ?? own;
  useEffect(() => {
    const bubble = box.current!;
    const opened = (event: Event) => {
      if ((event as ToggleEvent).newState !== "open") return;
      const top = keep?.current
        ? keep.current.getBoundingClientRect().top
        : bubble.getBoundingClientRect().top - BUTTON_ROOM;
      const below = bubble.getBoundingClientRect().bottom + SCROLL_MARGIN - window.innerHeight;
      if (below > 0) window.scrollBy(0, Math.min(below, top - SCROLL_MARGIN));
    };
    bubble.addEventListener("toggle", opened);
    return () => bubble.removeEventListener("toggle", opened);
  }, [box, keep]);
  return (
    <div
      ref={box}
      id={id}
      popover="auto"
      className={[styles.bubble, className].filter(Boolean).join(" ")}
      style={{ "--bubble-anchor": `--${id}` } as CSSProperties}
    >
      <span className={styles.pointer} aria-hidden="true" />
      {children}
    </div>
  );
}

/**
 * A button that opens a bubble (BubbleBox) under it, holding `children`.
 * `trigger` is the button's class, for how it looks, and `name` its
 * accessible name, where its label is only a glyph.
 */
export default function Bubble({
  id,
  label,
  trigger,
  name,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  trigger?: string;
  name?: string;
  className?: string;
  children: ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={button} type="button" className={trigger} aria-label={name} {...bubbleTrigger(id)}>
        {label}
      </button>
      <BubbleBox id={id} className={className} keep={button}>
        {children}
      </BubbleBox>
    </>
  );
}
