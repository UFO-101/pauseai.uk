import type { ReactNode } from "react";
import styles from "./PageIntro.module.css";

/** What a staff page is, in a grey line or two right under its title. */
export default function PageIntro({ children }: { children: ReactNode }) {
  return <p className={styles.intro}>{children}</p>;
}
