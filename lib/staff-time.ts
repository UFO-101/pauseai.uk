/** When something happened, for the staff pages: ISO date and time, to the minute, in UTC. "2026-10-16 10:34". */
export function staffTime(at: string): string {
  return new Date(at).toISOString().slice(0, 16).replace("T", " ");
}
