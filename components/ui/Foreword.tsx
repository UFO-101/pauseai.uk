import type { ReactNode } from "react";
import styles from "./Foreword.module.css";

/**
 * A white band of introduction under a page's hero: paragraphs, and a list
 * if need be, with an optional heading. `dropCap` sets the first letter
 * large; `pageWidth` lines it up with the page's reading column
 * (--measure-page) rather than running a little wider.
 */
export default function Foreword({
  title,
  dropCap,
  pageWidth,
  children,
}: {
  title?: string;
  dropCap?: boolean;
  pageWidth?: boolean;
  children: ReactNode;
}) {
  const classes = [styles.foreword, pageWidth && styles.pageWidth, dropCap && styles.dropCap].filter(Boolean).join(" ");
  return (
    <section className={classes}>
      <div className="container">
        {title && <h2 className={styles.title}>{title}</h2>}
        <div className={styles.body}>{children}</div>
      </div>
    </section>
  );
}
