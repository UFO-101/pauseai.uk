import type { ReactNode } from "react";
import styles from "./Table.module.css";

/**
 * A table that scrolls sideways on a phone, rather than the page. Its
 * children are its thead and tbody. Its text and cells follow the density:
 * tight in the staff interface.
 */
export default function Table({ children }: { children: ReactNode }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
