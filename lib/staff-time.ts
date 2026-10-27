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
