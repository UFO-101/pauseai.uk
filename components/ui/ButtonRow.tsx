import type { ReactNode } from "react";
import styles from "./ButtonRow.module.css";

/** A row of buttons, centred under what they follow, wrapping when narrow. */
export default function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
