import type { CSSProperties, ReactNode } from "react";
import styles from "./PhotoCard.module.css";

/**
 * The class for a card with a photo across its top and words under it: an
 * <article>, or a link (`link`), which lifts on hover. Put a PhotoCardImage
 * and a PhotoCardBody inside.
 */
export function photoCardClass({ link = false }: { link?: boolean } = {}) {
  return link ? `${styles.card} ${styles.link}` : styles.card;
}

/** The card's photo, 3:2, as a background so `style` can move its crop. */
export function PhotoCardImage({ style }: { style: CSSProperties }) {
  return <div className={styles.image} style={style}></div>;
}

/** The card's words: an <h3> and a paragraph or two. */
export function PhotoCardBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}
