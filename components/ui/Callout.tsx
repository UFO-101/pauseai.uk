import type { CSSProperties, ReactNode } from "react";
import styles from "./Callout.module.css";

/** Words on one side, an action (a button, a photo) on the other; stacked on a phone. */
export default function Callout({ style, children }: { style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={styles.callout} style={style}>
      {children}
    </div>
  );
}
