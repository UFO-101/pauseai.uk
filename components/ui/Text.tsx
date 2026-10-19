import type { ReactNode } from "react";
import styles from "./Text.module.css";

/** Secondary text, in the secondary colour: a date, an email, a "none". */
export function Muted({ children }: { children: ReactNode }) {
  return <span className={styles.muted}>{children}</span>;
}

/** Words saying something went wrong, in the danger colour, inside other text. A form's error is a FieldError. */
export function ErrorText({ children }: { children: ReactNode }) {
  return <span className={styles.error}>{children}</span>;
}
