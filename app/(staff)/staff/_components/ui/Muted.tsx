import type { ReactNode } from "react";
import styles from "./Muted.module.css";

/** Secondary text, in the secondary colour: a date, an email, a "none". */
export default function Muted({ children }: { children: ReactNode }) {
  return <span className={styles.muted}>{children}</span>;
}
