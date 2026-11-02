/** A heading of a list, and its items in order. */
export type DatedGroup<T> = { key: string; heading: string; items: T[] };

/**
 * Things that happened, newest first, under their month for the twelve
 * months to `now`'s, and under their year before that, by `when`, an ISO
 * string. A month or year with none has no heading. Days are read in UTC,
 * as staffDate reads them.
 */
export function monthsAndYears<T>(items: readonly T[], when: (item: T) => string, now: Date): DatedGroup<T>[] {
  // The first of the month eleven months before now's.
  const months = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString();
  const groups: DatedGroup<T>[] = [];
  for (const item of [...items].sort((a, b) => when(b).localeCompare(when(a)))) {
    const at = when(item);
    const byMonth = at >= months;
    const key = at.slice(0, byMonth ? 7 : 4);
    const heading = byMonth
      ? new Date(at).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
      : key;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, heading, items: [item] });
  }
  return groups;
}
