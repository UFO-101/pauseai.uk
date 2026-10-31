import type { Metadata } from "next";
import FlyeringTracker, { type FlyeringRace } from "../_components/FlyeringTracker";
import { now } from "@/lib/now";
import { getRaceCounts } from "@/lib/server/outside-services/luma-guests";

// Each team's QR code links to the event with ?utm_source=<team number>; Luma records it on every registration.
// The teams recruit for the 21 November march, so that is the event we count.
// Counting started at 12:16 GMT, when the tracker went up, and runs to the end of the flyering at 16:00 GMT.
// Registrations outside that window (QR code test scans before, stragglers after) don't count towards the race.
const RACE: FlyeringRace = {
  date: "31 October",
  day: "Saturday 31 October",
  eventApiId: "evt-1HKCXSHaJqGO3Bg",
  eventUrl: "https://luma.com/pauseai-nov26",
  open: new Date("2026-10-31T12:16:00Z"),
  close: new Date("2026-10-31T16:00:00Z"),
  unit: "team",
  closedMessage: "Flyering has finished.",
  untagged: "a team number",
  stalls: [
    { tag: "1", name: "Team 1" },
    { tag: "2", name: "Team 2" },
    { tag: "3", name: "Team 3" },
    { tag: "4", name: "Team 4" },
  ],
};

// Volunteer tracker: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: `Flyering tracker, ${RACE.date}`,
  robots: { index: false, follow: false },
};

export default async function FlyeringTrackerOct31Page() {
  const tags = RACE.stalls.map((stall) => stall.tag);
  const [result, afterResult] = await getRaceCounts(RACE.eventApiId, tags, RACE.open, RACE.close);
  return <FlyeringTracker race={RACE} result={result} afterResult={afterResult} now={now()} />;
}
