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

/** When a mailing goes, in London: "Thursday 30 October at 09:00". */
export function londonWhen(at: string): string {
  const { hour } = londonDayHour(at);
  const day = new Date(at).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  });
  return `${day} at ${String(hour).padStart(2, "0")}:00`;
}

/** How close to an hour is too close for a mailing to go on it. */
const TOO_SOON = 5 * 60_000;

/**
 * The first whole hour a mailing can go at, as an ISO string: one at least
 * TOO_SOON away. London's hours start when UTC's do.
 */
export function earliestHour(): string {
  return new Date(Math.ceil((Date.now() + TOO_SOON) / 3_600_000) * 3_600_000).toISOString();
}

/** `hour` on `day`, unless that's the first day a mailing can go and the hour is sooner than the first it can go at, when it's that. */
export function hourNotTooSoon(day: string, hour: number, earliest: { day: string; hour: number }): number {
  return day === earliest.day && hour < earliest.hour ? earliest.hour : hour;
}
