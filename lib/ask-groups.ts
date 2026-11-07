import { staffCopy } from "@/lib/content/staff-interface";
import { monthsAndYears, type DatedGroup } from "@/lib/dated-groups";
import type { AskWithCounts } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";

const month = (day: string, year: boolean) =>
  new Date(day).toLocaleDateString("en-GB", { month: "short", year: year ? "numeric" : undefined, timeZone: "UTC" });

/**
 * When an ask is or ran, in words. An event's day, a real date people need. A
 * letter runs over a time, so its months: from its first letter to its last, or
 * with none on record the month typed for it, if any.
 */
export function askPeriod(ask: AskWithCounts): string {
  if (ask.kind === "event") return ask.date ? staffDate(ask.date) : "";
  const { firstLetter: first, lastLetter: last } = ask;
  if (!first || !last) return ask.date ? month(ask.date, true) : "";
  if (first.slice(0, 7) === last.slice(0, 7)) return month(first, true);
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  return `${month(first, !sameYear)}–${month(last, true)}`;
}

/** The day an ask last moved, for ordering: a letter's last letter, or else the day typed for it. */
const lastDay = (ask: AskWithCounts) => (ask.kind === "letter" && ask.lastLetter) || ask.date || "";

/**
 * The asks list's groups, as their dates mean different things: Coming up, of
 * events today or later, a day to work towards, soonest first; then the rest,
 * a day going by, under their months and years (monthsAndYears), and last and
 * with no heading those with no day at all.
 */
export function askGroups(asks: AskWithCounts[], now: Date): DatedGroup<AskWithCounts>[] {
  const today = now.toISOString().slice(0, 10);
  const isComing = (ask: AskWithCounts) => ask.kind === "event" && Boolean(ask.date) && ask.date! >= today;
  const coming = asks.filter(isComing).sort((a, b) => a.date!.localeCompare(b.date!));
  return [
    ...(coming.length > 0 ? [{ key: "coming", heading: staffCopy.asks.comingUp, items: coming }] : []),
    ...monthsAndYears(
      asks.filter((ask) => !isComing(ask)),
      lastDay,
      now,
    ),
  ];
}
