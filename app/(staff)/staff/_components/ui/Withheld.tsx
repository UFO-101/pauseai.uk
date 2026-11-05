import type { ReactNode } from "react";
import styles from "./Withheld.module.css";

/**
 * Words standing in for something a permission keeps from this staff member:
 * a sealed envelope and muted italics, and never a link. Something simply
 * left out needs none of this. docs/style-guide.md, "What a permission hides".
 */
export default function Withheld({ children }: { children: ReactNode }) {
  return (
    <span className={styles.withheld}>
      <svg className={styles.envelope} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 5.5h16v10H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 5.5l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle className={styles.seal} cx="10" cy="11.5" r="3.1" />
      </svg>
      <span>{children}</span>
    </span>
  );
}
