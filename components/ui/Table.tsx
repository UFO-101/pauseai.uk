import type { ReactNode } from "react";
import styles from "./Table.module.css";

/**
 * A table that scrolls sideways on a phone, rather than the page, its
 * rows striped. Its children are its thead and tbody. Its text and cells follow the density:
 * tight in the staff interface. Each cell's content sits at its top, so
 * lines of text in a row start level; `align="middle"` centres it instead,
 * for rows of controls, whose boxes and buttons are taller than a line.
 */
export default function Table({ align = "top", children }: { align?: "top" | "middle"; children: ReactNode }) {
  return (
    <div className={styles.scroll}>
      <table className={align === "middle" ? `${styles.table} ${styles.middle}` : styles.table}>{children}</table>
    </div>
  );
}
