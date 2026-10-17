import type { ReactNode } from "react";
import styles from "./Tag.module.css";

/** Where an import is from, or that it runs every night. Plain without one. */
export type TagKind = "airtable" | "web" | "nightly";

/** A lozenge: a short label beside a name or a heading. */
export default function Tag({ kind, children }: { kind?: TagKind; children: ReactNode }) {
  return <span className={kind ? `${styles.tag} ${styles[kind]}` : styles.tag}>{children}</span>;
}
