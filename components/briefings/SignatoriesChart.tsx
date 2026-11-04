import type { CSSProperties, ReactNode } from "react";
import styles from "./SignatoriesChart.module.css";

/** How many had signed by a date, e.g. 22 on "21 Sep", the "launch". */
export type Count = { value: number; date: string; note: string };

/**
 * How many have signed something, over time: a bar for each count, standing
 * on a line of dates that runs on to a later event, and a callout above the
 * event, such as who hasn't signed. Drawn in its box's colour (--tone).
 */
export default function SignatoriesChart({
  title,
  counts,
  event,
  callout,
  cite,
}: {
  title: string;
  counts: Count[];
  /** What happened after the last count, on the line of dates. */
  event: { date: string; note: string };
  callout: string;
  /** The sources' footnote marks. */
  cite: ReactNode;
}) {
  const largest = Math.max(...counts.map((count) => count.value));
  return (
    <figure className={styles.chart}>
      <figcaption className={styles.title}>{title}</figcaption>
      <div className={styles.plot}>
        <ol className={styles.counts}>
          {counts.map((count) => (
            <li key={count.date}>
              <span className={styles.above}>
                <span className={styles.value}>{count.value}</span>
                <span className={styles.bar} style={{ "--share": count.value / largest } as CSSProperties} />
              </span>
              <span className={styles.below}>
                <span className={styles.date}>{count.date}</span>
                <span className={styles.note}>{count.note}</span>
              </span>
            </li>
          ))}
          <li className={styles.event}>
            <span className={styles.above}>
              <span className={styles.dot} />
            </span>
            <span className={styles.below}>
              <span className={styles.date}>{event.date}</span>
              <span className={styles.note}>{event.note}</span>
            </span>
          </li>
        </ol>
        <p className={styles.callout}>{callout}</p>
      </div>
      <p className={styles.cite}>{cite}</p>
    </figure>
  );
}
