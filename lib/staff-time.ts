/** The day something happened, for a heading over that day's runs: "3 Nov 2026", in UTC. */
export function staffDate(at: string): string {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** When something happened, for the staff pages: ISO date and time, to the minute, in UTC. "2026-10-16 10:34". */
export function staffTime(at: string): string {
  return new Date(at).toISOString().slice(0, 16).replace("T", " ");
}
