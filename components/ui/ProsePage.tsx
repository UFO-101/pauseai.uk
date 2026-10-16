import type { ReactNode } from "react";
import styles from "./ProsePage.module.css";

/** A page of plain prose, a reading column wide: the privacy policy, the 404. */
export default function ProsePage({ children }: { children: ReactNode }) {
  return (
    <section className={styles.page}>
      <div className="container">{children}</div>
    </section>
  );
}

/** A small line under the title: when it was last updated, say. */
export function ProseMeta({ children }: { children: ReactNode }) {
  return <p className={styles.meta}>{children}</p>;
}
