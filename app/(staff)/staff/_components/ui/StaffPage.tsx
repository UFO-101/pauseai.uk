import type { ReactNode } from "react";
import styles from "./StaffPage.module.css";

type Props = {
  as?: "main" | "div";
  /** The navigation: a sidebar beside the page on wider screens, a bar above it on a phone. */
  nav?: ReactNode;
  children: ReactNode;
};

/**
 * The <main> every staff page wraps itself in, at the compact density
 * (styles/tokens.css): the site's fields, tables and tags, tighter. With
 * `nav`, the page takes the width beside it. `as="div"` frames a part of a
 * staff page the same way inside another page's <main>, as the component
 * gallery does.
 */
export default function StaffPage({ as: Tag = "main", nav, children }: Props) {
  return (
    <Tag className={nav ? `${styles.page} ${styles.withNav}` : styles.page} data-density="compact">
      {nav}
      <div className={styles.content}>{children}</div>
    </Tag>
  );
}
