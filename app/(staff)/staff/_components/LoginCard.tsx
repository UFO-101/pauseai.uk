import type { ReactNode } from "react";
import styles from "./LoginCard.module.css";

/** The login page's card, in the middle like any login: its heading, then the form or what happened. */
export default function LoginCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.login}>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
