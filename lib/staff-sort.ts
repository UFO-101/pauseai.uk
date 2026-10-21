// Sorting a staff table by clicking a column heading: the sort and its
// direction travel in the URL as `sort` and `dir`, with each table's
// columns and their natural direction given here by the page.

export type SortDirection = "asc" | "desc";
export type SortSpec<Key extends string> = { key: Key; dir: SortDirection };

/** A table's sortable columns, each with the direction a first click gives. */
export type SortColumns<Key extends string> = Record<Key, SortDirection>;

/** The sort from the URL: a known column and direction, or `fallback` in its natural direction. */
export function parseSort<Key extends string>(
  columns: SortColumns<Key>,
  fallback: Key,
  sort = "",
  dir = "",
): SortSpec<Key> {
  const key = Object.hasOwn(columns, sort) ? (sort as Key) : fallback;
  return { key, dir: dir === "asc" || dir === "desc" ? dir : columns[key] };
}

/**
 * The URL a column heading links to: the same filters, from the first
 * page, sorted by `key` in its natural direction, or the other way if the
 * table is already sorted by it.
 */
export function sortHref<Key extends string>(
  path: string,
  filters: Record<string, string>,
  columns: SortColumns<Key>,
  current: SortSpec<Key>,
  key: Key,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value);
  params.set("sort", key);
  const flipped = current.dir === "asc" ? "desc" : "asc";
  params.set("dir", key === current.key ? flipped : columns[key]);
  return `${path}?${params}`;
}
