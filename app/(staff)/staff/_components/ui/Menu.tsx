import type { CSSProperties, ReactNode } from "react";
import styles from "./Menu.module.css";

/**
 * A button that opens a box under it: choices, or a small form. The box is
 * a popover, so it needs no script: a click elsewhere, or Escape, closes it.
 * Where the browser can anchor it, it hangs below the button; elsewhere it
 * sits in the middle of the window. `id` must be unique on the page.
 * `trigger` is the button's class, for how it looks.
 */
export default function Menu({
  id,
  label,
  trigger,
  children,
}: {
  id: string;
  label: ReactNode;
  trigger?: string;
  children: ReactNode;
}) {
  return (
    <>
      <button type="button" popoverTarget={id} className={trigger} style={{ anchorName: `--${id}` } as CSSProperties}>
        {label}
      </button>
      <div id={id} popover="auto" className={styles.menu} style={{ positionAnchor: `--${id}` } as CSSProperties}>
        {children}
      </div>
    </>
  );
}
