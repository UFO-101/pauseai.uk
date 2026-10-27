import ListLink from "./ui/ListLink";
import type { SortSpec } from "@/lib/staff-sort";
import styles from "./SortHeading.module.css";

type Props<Key extends string> = {
  sortKey: Key;
  current: SortSpec<Key>;
  /** The URL that sorts by this column (lib/staff-sort.ts's sortHref). */
  href: string;
  children: string;
};

/**
 * A column heading that sorts its table: a link to the sorted list, and when
 * the table is sorted by it, an arrow for the direction and a link the other
 * way.
 */
export default function SortHeading<Key extends string>({ sortKey, current, href, children }: Props<Key>) {
  const active = current.key === sortKey;
  return (
    <th aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : undefined}>
      <ListLink href={href} className={styles.heading}>
        {children}
        {active && <span aria-hidden="true">{current.dir === "asc" ? " ▲" : " ▼"}</span>}
      </ListLink>
    </th>
  );
}
