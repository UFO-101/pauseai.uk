import { filtersPath } from "@/lib/staff-search";
import StaffLink from "./StaffLink";
import styles from "./Counts.module.css";

/**
 * One count: its number, or none for a count that doesn't apply, shown as
 * a dash; its label; where it leads; and red for a problem or green for
 * what's hoped for, when it isn't 0. `current` marks the one a list under
 * it is filtered to; `title`, what pressing it does, when that isn't plain.
 */
export type Count = {
  key: string;
  n: number | null;
  label: string;
  href?: string;
  tone?: "red" | "green";
  current?: boolean;
  title?: string;
};

/** Counts that each open `path` with their own tab already chosen. */
export function countsOpening<T extends Count>(path: string, counts: T[]): T[] {
  return counts.map((count) => ({ ...count, href: filtersPath(path, { tab: count.key }) }));
}

/**
 * Numbers side by side in one white box, each over its label, a 0 or a
 * dash grey (a supporter's events and letters, how a mailing went). Each
 * leads where its `href` says. `small` in a list's row.
 */
export default function Counts({ counts, small = false }: { counts: Count[]; small?: boolean }) {
  const cells = counts.map((count) => {
    const inner = (
      <>
        <strong data-tone={count.n ? count.tone : "none"} data-zero={!count.n || undefined}>
          {count.n === null ? "–" : count.n.toLocaleString("en-GB")}
        </strong>{" "}
        {count.label}
      </>
    );
    return count.href ? (
      <StaffLink
        key={count.key}
        href={count.href}
        className={styles.count}
        aria-current={count.current ? "true" : undefined}
        title={count.title}
      >
        {inner}
      </StaffLink>
    ) : (
      <span key={count.key} className={styles.count}>
        {inner}
      </span>
    );
  });
  return <div className={small ? `${styles.counts} ${styles.small}` : styles.counts}>{cells}</div>;
}
