import type { ReactNode } from "react";
import styles from "./BriefingQuote.module.css";

/**
 * A quote in a briefing, ruled in its box's colour, with who said it under
 * it. `size`: "large" for a pull quote beside the text, "small" for quotes
 * side by side.
 */
export default function BriefingQuote({
  who,
  size = "medium",
  children,
}: {
  who: string;
  size?: "small" | "medium" | "large";
  children: ReactNode;
}) {
  return (
    <blockquote className={`${styles.quote} ${styles[size]}`}>
      <p className={styles.words}>{children}</p>
      <p className={styles.who}>{who}</p>
    </blockquote>
  );
}
