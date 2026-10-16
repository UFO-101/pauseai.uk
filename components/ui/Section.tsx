import type { CSSProperties, ReactNode } from "react";
import styles from "./Section.module.css";

/**
 * A band of a page, with room above and below. `tone` gives it a
 * background (the muted beige, or white), and `bordered` a pale orange
 * rule top and bottom. `snug` takes some of the room away on a phone.
 * Put a `.container` inside for the content's width.
 */
export default function Section({
  id,
  tone,
  bordered,
  snug,
  children,
}: {
  id?: string;
  tone?: "muted" | "white";
  bordered?: boolean;
  snug?: boolean;
  children: ReactNode;
}) {
  const classes = [styles.section, tone && styles[tone], bordered && styles.bordered, snug && styles.snug]
    .filter(Boolean)
    .join(" ");
  return (
    <section id={id} className={classes}>
      {children}
    </section>
  );
}

/** A section's heading, with a lede under it. */
export function SectionHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </div>
  );
}

/**
 * A sentence or two introducing a section, held to a short measure unless
 * `long`.
 */
export function Lede({ long, style, children }: { long?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <p className={long ? `${styles.lede} ${styles.long}` : styles.lede} style={style}>
      {children}
    </p>
  );
}
