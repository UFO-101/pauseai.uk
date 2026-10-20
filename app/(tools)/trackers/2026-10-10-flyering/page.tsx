import type { Metadata } from "next";
import FlyeringTracker, { type FlyeringRace } from "../_components/FlyeringTracker";
import { now } from "@/lib/now";
import { getRaceCounts } from "@/lib/server/outside-services/luma-guests";

// Each team's QR code links to the event with ?utm_source=<team number>; Luma records it on every registration.
// The teams recruit for the 21 November march, so that is the event we count.
// Counting started at 13:13 BST, when the tracker went up, and runs to the end of the flyering at 16:00 BST.
// Registrations outside that window (QR code test scans before, stragglers after) don't count towards the race.
const RACE: FlyeringRace = {
  date: "10 October",
  day: "Saturday 10 October",
  eventApiId: "evt-1HKCXSHaJqGO3Bg",
  eventUrl: "https://luma.com/pauseai-nov26",
  open: new Date("2026-10-10T13:13:00+01:00"),
  close: new Date("2026-10-10T16:00:00+01:00"),
  unit: "team",
  closedMessage: "Flyering has finished.",
  untagged: "a team number",
  stalls: [
    { tag: "1", name: "Team 1" },
    { tag: "2", name: "Team 2" },
    { tag: "3", name: "Team 3" },
    { tag: "4", name: "Team 4" },
    { tag: "5", name: "Team 5" },
    { tag: "6", name: "Team 6" },
  ],
};

// Volunteer tracker: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: `Flyering tracker, ${RACE.date}`,
  robots: { index: false, follow: false },
};

export default async function FlyeringTrackerOct10Page() {
  const tags = RACE.stalls.map((stall) => stall.tag);
  const [result, afterResult] = await getRaceCounts(RACE.eventApiId, tags, RACE.open, RACE.close);
  return <FlyeringTracker race={RACE} result={result} afterResult={afterResult} now={now()} />;
}
