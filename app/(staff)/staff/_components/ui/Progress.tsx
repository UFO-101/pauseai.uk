import type { ReactNode } from "react";
import styles from "./Progress.module.css";

/**
 * How far something has got: its words, then a bar filled `value` of
 * `max`, blue for sending, green for answers (docs/style-guide.md,
 * "Staff pages"). `big` on a page of its own, thin in a list's row.
 */
export default function Progress({
  value,
  max,
  tone,
  label,
  big = false,
  children,
}: {
  value: number;
  max: number;
  tone: "blue" | "green";
  /** What the bar measures, for a screen reader. */
  label: string;
  big?: boolean;
  /** Its words, over the bar. */
  children: ReactNode;
}) {
  return (
    <div className={big ? `${styles.progress} ${styles.big}` : styles.progress}>
      <span className={styles.words}>{children}</span>
      <progress className={styles[tone]} max={Math.max(max, 1)} value={value} aria-label={label} />
    </div>
  );
}
