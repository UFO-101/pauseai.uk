import type { CSSProperties, ReactNode } from "react";
import styles from "./SignatoriesChart.module.css";

/** How many had signed by a date, e.g. 22 on "21 Sep", the "launch". */
export type Count = { value: number; date: string; note: string };

/**
 * How many have signed something, over time: a bar for each count, along a
 * line of dates that ends with a later event, and a callout beside them,
 * such as who hasn't signed.
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
            <li key={count.date} style={{ "--share": count.value / largest } as CSSProperties}>
              <span className={styles.value}>{count.value}</span>
              <span className={styles.bar} />
              <span className={styles.date}>{count.date}</span>
              <span className={styles.note}>{count.note}</span>
            </li>
          ))}
          <li className={styles.event}>
            <span className={styles.dot} />
            <span className={styles.eventDate}>{event.date}</span>
            <span className={styles.eventNote}>{event.note}</span>
          </li>
        </ol>
        <p className={styles.callout}>{callout}</p>
      </div>
      <p className={styles.cite}>{cite}</p>
    </figure>
  );
}
