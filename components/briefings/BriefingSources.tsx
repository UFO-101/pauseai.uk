import type { ReactNode } from "react";
import styles from "./BriefingSources.module.css";

/**
 * A briefing's sources, numbered as the marks that cite them: each `<li>`
 * has the id `source-N`, which a mark links to.
 */
export default function BriefingSources({ children }: { children: ReactNode }) {
  return (
    <section className={styles.sources}>
      <h2 className={styles.heading}>Sources</h2>
      <ol className={styles.list}>{children}</ol>
    </section>
  );
}
