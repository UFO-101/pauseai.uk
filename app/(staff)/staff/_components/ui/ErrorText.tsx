import type { ReactNode } from "react";
import styles from "./ErrorText.module.css";

/** Text saying something went wrong, in the danger colour. */
export default function ErrorText({ children }: { children: ReactNode }) {
  return <span className={styles.error}>{children}</span>;
}
