import type { ReactNode } from "react";
import styles from "./Actions.module.css";

/** A row of buttons after what they act on, from the left, stacked on a phone. ButtonRow centres them under a section. */
export default function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
