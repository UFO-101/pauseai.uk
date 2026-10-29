// Days as the date picker (components/ui/DatePicker.tsx) handles them:
// "yyyy-mm-dd" strings, as a form posts a date, worked on in UTC so a day is
// never shifted by a clock change.

const DAY = 86_400_000;

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const fromDate = (date: Date) => date.toISOString().slice(0, 10);

/** Whether a string is a day the picker can show: "yyyy-mm-dd", and a real one. */
export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromDate(new Date(Date.parse(`${value}T00:00:00Z`) || 0)) === value;
}

/** The day `n` days after `day`, or before it if `n` is negative. */
export function addDays(day: string, n: number): string {
  return fromDate(new Date(toDate(day).getTime() + n * DAY));
}

/** The Monday of the week `day` is in. */
export function mondayOf(day: string): string {
  return addDays(day, -((toDate(day).getUTCDay() + 6) % 7));
}

/** `weeks` weeks of days from `monday`, a week to a row. */
export function weeksFrom(monday: string, weeks: number): string[][] {
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, d) => addDays(monday, week * 7 + d)));
}

/** Today, in London, where the site's people are. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// Without the comma after the weekday that some versions of Intl put in.
const format = (day: string, options: Intl.DateTimeFormatOptions) =>
  toDate(day)
    .toLocaleDateString("en-GB", { ...options, timeZone: "UTC" })
    .replace(",", "");

/** A day as the picker's button shows it: "Fri 30 Oct 2026". */
export function shortDay(day: string): string {
  return format(day, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** A day in full, for a screen reader: "Friday 30 October 2026". */
export function longDay(day: string): string {
  return format(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** A day's month, short: "Oct". */
export function shortMonth(day: string): string {
  return format(day, { month: "short" });
}

/** The months a run of days spans, as the calendar's heading: "October 2026", "October – November 2026", or across a new year "December 2026 – January 2027". */
export function monthsBetween(first: string, last: string): string {
  const month = (day: string) => format(day, { month: "long" });
  const year = (day: string) => day.slice(0, 4);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${month(first)} ${year(first)}`;
  if (year(first) === year(last)) return `${month(first)} – ${month(last)} ${year(last)}`;
  return `${month(first)} ${year(first)} – ${month(last)} ${year(last)}`;
}
