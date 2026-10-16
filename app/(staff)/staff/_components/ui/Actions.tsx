import type { ReactNode } from "react";
import styles from "./Actions.module.css";

/** A row of buttons, side by side, stacked on a phone. */
export default function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
