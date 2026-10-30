import type { ReactNode } from "react";
import styles from "./PageTitle.module.css";

/**
 * A staff page's title, with the page's main button at the right, the one
 * thing it's there to start (New mailing): first seen, and in the same
 * place however long the page below it grows. On a phone the button wraps
 * under the title.
 */
export default function PageTitle({ action, children }: { action: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.title}>
      <h1>{children}</h1>
      {action}
    </div>
  );
}
