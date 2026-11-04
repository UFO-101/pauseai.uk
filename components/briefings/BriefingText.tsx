import type { ReactNode } from "react";
import styles from "./BriefingText.module.css";

/** The start of a story's heading, in its box's colour: "Mon 26 Oct - Lords -". */
export function Accent({ children }: { children: ReactNode }) {
  return <span className={styles.accent}>{children}</span>;
}

/** A line leading into what follows it, bold in its box's colour: "What changed on Monday?". */
export function Subhead({ children }: { children: ReactNode }) {
  return <p className={styles.subhead}>{children}</p>;
}

/** A word flagged in red beside a heading: "POSTPONED". */
export function Flag({ children }: { children: ReactNode }) {
  return <span className={styles.flag}>{children}</span>;
}

/** A last paragraph set off by a dashed rule, such as what's further ahead. */
export function Aside({ children }: { children: ReactNode }) {
  return <p className={styles.aside}>{children}</p>;
}
