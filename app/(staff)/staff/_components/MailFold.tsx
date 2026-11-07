import type { ReactNode } from "react";
import styles from "./MailFold.module.css";

/**
 * Part of an email that's rarely worth reading, folded: `summary`, a dashed
 * line across the email saying what's there, which a click unfolds, and
 * again folds. Unfolded, the words are grey, and keep their line breaks.
 */
export default function MailFold({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className={styles.fold}>
      <summary>{summary}</summary>
      <div className={styles.text}>{children}</div>
    </details>
  );
}
