import type { ReactNode } from "react";
import styles from "./FormParts.module.css";

// The Email your MP tool's own layout. Its fields, hints and errors are the
// site's (components/ui/Field.tsx, Controls.tsx).

/** The tool's one column, the letter's width, in line with the section's heading. */
export function Column({ children }: { children: ReactNode }) {
  return <div className={styles.tool}>{children}</div>;
}

/** A note set apart with an orange edge. */
export function Notice({ children }: { children: ReactNode }) {
  return <p className={styles.notice}>{children}</p>;
}
