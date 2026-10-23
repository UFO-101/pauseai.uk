import type { ReactNode } from "react";
import styles from "./Grid.module.css";

/**
 * How many of the grid's columns something takes on a wide screen: a
 * sixth, a third, a half, two-thirds or all of it (docs/style-guide.md,
 * "Staff pages").
 */
export type Span = 1 | 2 | 3 | 4 | 6;

const SPANS: Record<Span, string> = {
  1: styles.s1,
  2: styles.s2,
  3: styles.s3,
  4: styles.s4,
  6: styles.s6,
};

/**
 * The class that sets an item of a `Grid` to take `span` columns, for an
 * item that isn't a `Card` (a tile, a list item).
 */
export function spanClass(span: Span): string {
  return SPANS[span];
}

/**
 * The staff pages' grid: six columns on a wide screen; below that two, in
 * which a sixth sits beside another and anything wider takes the row; by
 * the width it's given. Everything boxed
 * on a staff page is an item of one, and says how many columns it takes;
 * nothing sets its own width. `as="ul"` for a list of tiles, labelled.
 * Each item is as tall as what's in it; `even`, for things of one kind
 * side by side, makes each as tall as its row.
 */
export default function Grid({
  as: Tag = "div",
  label,
  even = false,
  children,
}: {
  as?: "div" | "ul";
  label?: string;
  even?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <Tag className={even ? `${styles.grid} ${styles.even}` : styles.grid} aria-label={label}>
        {children}
      </Tag>
    </div>
  );
}

/**
 * What a card is for, which sets its look (docs/style-guide.md, "Staff
 * pages"): every card has the same edge, and its fill says what it's
 * for. `record`, white, the thing a page is about or a thing to open;
 * `aside`, the page's second tint, what sits beside a record; `log`, the
 * palest of the accent, a history.
 */
export type CardLook = "record" | "aside" | "log";

/**
 * A card in a `Grid`: the staff pages' one kind of box, its parts spaced
 * down it, looking like what it's for (`look`). A `title` heads it, and
 * names it for a screen reader. `className` is for what it does (a hover,
 * a stretched link), never its look.
 */
export function Card({
  span,
  look = "record",
  as: Tag = "section",
  title,
  id,
  className,
  children,
}: {
  span: Span;
  look?: CardLook;
  as?: "section" | "div" | "li";
  title?: ReactNode;
  /** The title's id, for the card's name; needed with `title`. */
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={[styles.card, styles[look], SPANS[span], className].filter(Boolean).join(" ")}
      aria-labelledby={title ? id : undefined}
    >
      {title && (
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
      )}
      {children}
    </Tag>
  );
}
