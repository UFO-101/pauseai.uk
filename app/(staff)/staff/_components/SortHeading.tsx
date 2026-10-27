import StaffLink from "./ui/StaffLink";
import type { SortSpec } from "@/lib/staff-sort";
import styles from "./SortHeading.module.css";

type Props<Key extends string> = {
  sortKey: Key;
  current: SortSpec<Key>;
  /** The URL that sorts by this column (lib/staff-sort.ts's sortHref). */
  href: string;
  children: string;
};

/** The arrow for a direction: up for ascending, down for descending. */
const arrow = (dir: string | null) => (dir === "asc" ? " ▲" : " ▼");

/**
 * A column heading that sorts its table: a link to the sorted list, and when
 * the table is sorted by it, an arrow for the direction and a link the other
 * way. Clicked, it shows the arrow its link sorts by at once, and the
 * heading it was sorted by loses its own, while the list loads (StaffLink).
 */
export default function SortHeading<Key extends string>({ sortKey, current, href, children }: Props<Key>) {
  const active = current.key === sortKey;
  const next = new URLSearchParams(href.slice(href.indexOf("?"))).get("dir");
  return (
    <th aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : undefined}>
      <StaffLink href={href} className={styles.heading}>
        {children}
        {active && (
          <span aria-hidden="true" className={styles.now}>
            {arrow(current.dir)}
          </span>
        )}
        <span aria-hidden="true" className={styles.next}>
          {arrow(next)}
        </span>
      </StaffLink>
    </th>
  );
}
