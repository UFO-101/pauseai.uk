import type { ReactNode } from "react";
import styles from "./SmallPrint.module.css";

/** Small print under a rule: who runs PauseAI UK, its company number. */
export default function SmallPrint({ children }: { children: ReactNode }) {
  return <div className={styles.smallPrint}>{children}</div>;
}
