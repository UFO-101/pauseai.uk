import type { ReactNode } from "react";
import styles from "./StaffPage.module.css";

/**
 * The <main> every staff page wraps itself in, at the compact density
 * (styles/tokens.css): the site's fields, tables and tags, tighter. `as="div"`
 * frames a part of a staff page the same way inside another page's <main>,
 * as the component gallery does.
 */
export default function StaffPage({ as: Tag = "main", children }: { as?: "main" | "div"; children: ReactNode }) {
  return (
    <Tag className={`container ${styles.page}`} data-density="compact">
      {children}
    </Tag>
  );
}
