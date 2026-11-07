import type { CSSProperties, ReactNode } from "react";
import styles from "./Menu.module.css";

/** A list of choices that do something, in a menu's box, and one of them, a button or a link; one that sends a form is MenuSubmit. */
export const menuItemsClass = styles.items;
export const menuItemClass = styles.item;
/** One that destroys something: red words, and red all over when asking to be pressed again. */
export const menuItemDangerClass = `${styles.item} ${styles.danger}`;
export const menuItemArmedClass = `${styles.item} ${styles.armed}`;

/**
 * A button that opens a box under it: choices, or a small form. The box is
 * a popover, so it needs no script: a click elsewhere, or Escape, closes it.
 * Where the browser can anchor it, it hangs below the button; elsewhere it
 * sits in the middle of the window. `id` must be unique on the page.
 * `trigger` is the button's class, for how it looks, and `name` its
 * accessible name, where its label is only a glyph. `wide` is for rows too
 * long for its usual box.
 */
export default function Menu({
  id,
  label,
  trigger,
  name,
  wide = false,
  children,
}: {
  id: string;
  label: ReactNode;
  trigger?: string;
  name?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        className={trigger}
        aria-label={name}
        style={{ anchorName: `--${id}` } as CSSProperties}
      >
        {label}
      </button>
      <div
        id={id}
        popover="auto"
        className={wide ? `${styles.menu} ${styles.wide}` : styles.menu}
        style={{ positionAnchor: `--${id}` } as CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
