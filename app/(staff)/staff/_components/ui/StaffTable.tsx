import type { ReactNode } from "react";
import styles from "./StaffTable.module.css";

/** A table that scrolls sideways on a phone, rather than the page. Its children are its thead and tbody. */
export default function StaffTable({ children }: { children: ReactNode }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
