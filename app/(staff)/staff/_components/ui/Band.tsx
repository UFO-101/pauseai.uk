import type { ReactNode } from "react";
import styles from "./Band.module.css";

/**
 * One fact in a Band: its label, its value, and a quiet line under it of
 * where it's from or what it adds. Nothing when there's no value.
 */
export function BandFact({ label, detail, children }: { label: string; detail?: ReactNode; children: ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
      {detail && <dd className={styles.detail}>{detail}</dd>}
    </div>
  );
}

/**
 * The tinted band at the top of a record's page (a supporter's, a
 * mailing's): `lead` at its left, such as a map; the title, with a tag
 * beside it; under it the facts (BandFact), with `aside` at their right,
 * such as Counts. It wraps on a narrow screen.
 */
export default function Band({
  title,
  tag,
  lead,
  aside,
  className,
  children,
}: {
  title: ReactNode;
  tag?: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  /** For its place on the page: the space under it. */
  className?: string;
  /** The facts, each a BandFact. */
  children: ReactNode;
}) {
  return (
    <div className={className ? `${styles.band} ${className}` : styles.band}>
      {lead}
      <div className={styles.main}>
        <div className={styles.heading}>
          <h1>{title}</h1>
          {tag}
        </div>
        <div className={styles.row}>
          <dl className={styles.facts}>{children}</dl>
          {aside}
        </div>
      </div>
    </div>
  );
}
