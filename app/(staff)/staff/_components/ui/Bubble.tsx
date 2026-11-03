import type { CSSProperties, ReactNode, Ref } from "react";
import styles from "./Bubble.module.css";

/**
 * What a button needs to open the bubble `id` and have it point to it: for
 * a button of its own look, such as an IconButton. `id` must be unique on
 * the page.
 */
export function bubbleTrigger(id: string) {
  return { popoverTarget: id, style: { anchorName: `--${id}` } as CSSProperties };
}

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
 */
export function BubbleBox({
  id,
  className,
  ref,
  children,
}: {
  id: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
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
  return (
    <>
      <button type="button" className={trigger} aria-label={name} {...bubbleTrigger(id)}>
        {label}
      </button>
      <BubbleBox id={id} className={className}>
        {children}
      </BubbleBox>
    </>
  );
}
