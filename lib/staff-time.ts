import { now } from "./now";

/** The day something happened, for a heading over that day's runs: "3 Nov 2026", in UTC. */
export function staffDate(at: string): string {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** When something happened, for the staff pages: the day as staffDate says it, and the time to the minute, in UTC. "16 Oct 2026, 10:34". */
export function staffTime(at: string): string {
  return `${staffDate(at)}, ${staffClock(at)}`;
}

/** The time of day, to the minute, in UTC, for a row under a heading that gives the day. "10:34". */
export function staffClock(at: string): string {
  return new Date(at).toISOString().slice(11, 16);
}

/** The day as a heading reads it: weekday, day and month, in UTC. "Friday 16 October". */
export function staffDay(at: string): string {
  return new Date(at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** The day, as yyyy-mm-dd, and the hour, in London, of a moment: what a mailing's When says. */
export function londonDayHour(at: string): { day: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(at))
      .map((part) => [part.type, part.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** The moment, as an ISO string, that's `hour` o'clock on `day` (yyyy-mm-dd) in London. */
export function fromLondon(day: string, hour: number): string {
  const guess = Date.parse(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  // London is never behind UTC: the guess, or an hour before it in summer time.
  const summer = londonDayHour(new Date(guess).toISOString()).hour !== hour;
  return new Date(guess - (summer ? 3_600_000 : 0)).toISOString();
}

/**
 * When the hourly sending runs, in UTC: at this minute past each hour from
 * the first to the end of the day (netlify/functions/send-mailings, whose
 * test checks its schedule says the same).
 */
export const SENDING = { minute: 18, firstHour: 6 };

/** The moment, as an ISO string, a mailing due at `at`, a whole hour, goes: that hour's run of the sending, or overnight the day's first. */
export function sendsAt(at: string): string {
  const sends = new Date(at);
  sends.setUTCHours(Math.max(sends.getUTCHours(), SENDING.firstHour), SENDING.minute);
  return sends.toISOString();
}

/** The time of day, in London, to the minute: "09:18". */
export function londonClock(at: string): string {
  return new Date(at).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** When a mailing due at `at` goes, in London: "Thursday 30 October at 09:18". */
export function londonWhen(at: string): string {
  const sends = sendsAt(at);
  const day = new Date(sends).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });
  return `${day} at ${londonClock(sends)}`;
}

/** How close to an hour is too close for a mailing to go on it. */
const TOO_SOON = 5 * 60_000;

/**
 * The first whole hour a mailing can go at, as an ISO string: one at least
 * TOO_SOON away. London's hours start when UTC's do. By the site's clock
 * (lib/now.ts), so in a fixture build a page rendered ahead of time offers
 * the hours the browser does.
 */
export function earliestHour(): string {
  return new Date(Math.ceil((now().getTime() + TOO_SOON) / 3_600_000) * 3_600_000).toISOString();
}

/** `hour` on `day`, unless that's the first day a mailing can go and the hour is sooner than the first it can go at, when it's that. */
export function hourNotTooSoon(day: string, hour: number, earliest: { day: string; hour: number }): number {
  return day === earliest.day && hour < earliest.hour ? earliest.hour : hour;
}
