import type { ReactNode } from "react";
import styles from "./Tag.module.css";

/** A tag's colour: plain, or one of the status colours. */
export type TagTone = "amber" | "green" | "blue";

/** A lozenge: a short label beside a name or a heading, or one of a list of them. */
export default function Tag({ tone, children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={tone ? `${styles.tag} ${styles[tone]}` : styles.tag}>{children}</span>;
}
