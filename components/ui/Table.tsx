import type { ReactNode } from "react";
import styles from "./Table.module.css";

/**
 * A table that scrolls sideways on a phone, rather than the page, its
 * rows striped. Its children are its thead and tbody. Its text and cells follow the density:
 * tight in the staff interface. Each cell's content sits at its top, so
 * lines of text in a row start level; `align="middle"` centres it instead,
 * for rows of controls, whose boxes and buttons are taller than a line.
 * `layout="fixed"` shares the width out as the first row's cells set it,
 * not as the content asks, so tables of the same columns line up with one
 * another; a container sets `--table-min-width` to keep such a table from
 * being squeezed, scrolling instead. A row sets `--row-bg` to tint itself,
 * over the stripe.
 */
export default function Table({
  align = "top",
  layout = "auto",
  children,
}: {
  align?: "top" | "middle";
  layout?: "auto" | "fixed";
  children: ReactNode;
}) {
  const classes = [styles.table, align === "middle" && styles.middle, layout === "fixed" && styles.fixed]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.scroll}>
      <table className={classes}>{children}</table>
    </div>
  );
}
