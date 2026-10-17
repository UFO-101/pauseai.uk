import type { ReactNode } from "react";
import styles from "./PageHero.module.css";

// The concentric, rotating ellipses behind the track record's title, echoing
// the cover of the printed track record.
const CX = 300;
const CY = 300;
const RINGS = Array.from({ length: 40 }, (_, i) => ({
  rx: 80 + i * 5.2,
  ry: 160 + i * 3.4,
  rotate: i * 4.5,
}));

function Swirl() {
  return (
    <svg className={styles.swirl} viewBox="0 0 600 600" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55">
        {RINGS.map(({ rx, ry, rotate }) => (
          <ellipse key={rotate} cx={CX} cy={CY} rx={rx} ry={ry} transform={`rotate(${rotate} ${CX} ${CY})`} />
        ))}
      </g>
    </svg>
  );
}

type Props = {
  /** The page's `<h1>`. */
  title: ReactNode;
  /** A sentence under the title, held to a short measure. */
  lede?: ReactNode;
  /** Above the title: a link back, say. */
  before?: ReactNode;
  /** Beside the title: a person's photo. */
  figure?: ReactNode;
  /** Under the title and lede: a byline, say. */
  children?: ReactNode;
  /** The track record's swirl in the corner. */
  swirl?: boolean;
  /**
   * `page` (the default) lines up with a reading column of
   * `--measure-page`; `wide` with a page of cards.
   */
  width?: "page" | "wide";
  /** Less room underneath, for a page whose text follows straight on. */
  tight?: boolean;
  /** Let the lede run the full width, as the text below it does. */
  longLede?: boolean;
  /** A smaller title, for a long one such as a blog post's. */
  smallTitle?: boolean;
};

/** The title band at the top of a page: a big title, and a lede under it. */
export default function PageHero({
  title,
  lede,
  before,
  figure,
  children,
  swirl,
  width = "page",
  tight,
  longLede,
  smallTitle,
}: Props) {
  const classes = [styles.hero, width === "wide" && styles.wide, tight && styles.tight].filter(Boolean).join(" ");
  const heading = <h1 className={smallTitle ? `${styles.title} ${styles.smallTitle}` : styles.title}>{title}</h1>;
  return (
    <section className={classes}>
      {swirl && <Swirl />}
      <div className={`container ${styles.inner}`}>
        {before}
        {figure ? (
          <div className={styles.heading}>
            {figure}
            <div className={styles.titleWrap}>{heading}</div>
          </div>
        ) : (
          heading
        )}
        {lede && <p className={longLede ? `${styles.lede} ${styles.longLede}` : styles.lede}>{lede}</p>}
        {children}
      </div>
    </section>
  );
}
