import type { ReactNode } from "react";
import styles from "./EmailYourMp.module.css";

/**
 * A label's words with a red asterisk after them, for a field that must be
 * filled in. The asterisk is CSS, so the label's text, which tests and
 * screen readers go by, is only the words: the field's `required` tells
 * screen readers.
 */
export default function Required({ children }: { children: ReactNode }) {
  return <span className={styles.required}>{children}</span>;
}
