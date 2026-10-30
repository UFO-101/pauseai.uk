import StaffLink from "./StaffLink";
import styles from "./Counts.module.css";

/**
 * One count: its number, or none for a count that doesn't apply, shown as
 * a dash; its label; where it leads; and red for a problem or green for
 * what's hoped for, when it isn't 0. `current` marks the one a list under
 * it is filtered to.
 */
export type Count = {
  key: string;
  n: number | null;
  label: string;
  href?: string;
  tone?: "red" | "green";
  current?: boolean;
};

/**
 * Numbers side by side in one white box, each over its label, a 0 or a
 * dash grey (a supporter's events and letters, how a mailing went). Each
 * leads where its `href` says; or with `href` on the box, the whole box
 * leads there. `small` in a list's row.
 */
export default function Counts({
  counts,
  href,
  small = false,
  label,
}: {
  counts: Count[];
  href?: string;
  small?: boolean;
  /** What the box is, for a screen reader, when the box is one link. */
  label?: string;
}) {
  const cells = counts.map((count) => {
    const inner = (
      <>
        <strong data-tone={count.n ? count.tone : "none"} data-zero={!count.n || undefined}>
          {count.n === null ? "–" : count.n.toLocaleString("en-GB")}
        </strong>{" "}
        {count.label}
      </>
    );
    return count.href && !href ? (
      <StaffLink
        key={count.key}
        href={count.href}
        className={styles.count}
        aria-current={count.current ? "true" : undefined}
      >
        {inner}
      </StaffLink>
    ) : (
      <span key={count.key} className={styles.count}>
        {inner}
      </span>
    );
  });
  const className = small ? `${styles.counts} ${styles.small}` : styles.counts;
  return href ? (
    <StaffLink href={href} className={className} aria-label={label}>
      {cells}
    </StaffLink>
  ) : (
    <div className={className}>{cells}</div>
  );
}
