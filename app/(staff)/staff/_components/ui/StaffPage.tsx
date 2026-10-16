import type { ReactNode } from "react";
import styles from "./StaffPage.module.css";

/** The <main> every staff page wraps itself in. */
export default function StaffPage({ children }: { children: ReactNode }) {
  return <main className={`container ${styles.page}`}>{children}</main>;
}
