import type { ReactNode } from "react";
import AlertIcon from "./AlertIcon";
import styles from "./Alert.module.css";

/**
 * A message that something is wrong or waiting, drawn as the staff pages'
 * alerts are: the status tint, a thin border in its colour, and its icon at
 * the left. Red for an error, read out at once (role="alert"); amber for
 * something waiting.
 */
export default function Alert({ tone = "red", children }: { tone?: "amber" | "red"; children: ReactNode }) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === "red" ? "alert" : "status"}>
      <AlertIcon tone={tone} />
      <div className={styles.body}>{children}</div>
    </div>
  );
}
