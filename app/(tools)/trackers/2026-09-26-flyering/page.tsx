import type { Metadata } from "next";
import FlyeringTracker, { type FlyeringRace } from "../_components/FlyeringTracker";
import { getRaceCounts } from "@/lib/server/luma-guests";
import "../trackers.css";

// Each stall's QR code links to the event with ?utm_source=<tag>; Luma records it on every registration.
// The stalls recruit for the 5 December march, so that is the event we count.
// The stalls run 12:00–16:00 BST. Registrations outside that window (QR code test scans before, stragglers after) don't count.
const RACE: FlyeringRace = {
  date: "26 September",
  day: "Saturday 26 September",
  eventApiId: "evt-1HKCXSHaJqGO3Bg",
  eventUrl: "https://luma.com/pauseai-dec26",
  open: new Date("2026-09-26T12:00:00+01:00"),
  close: new Date("2026-09-26T16:00:00+01:00"),
  unit: "stall",
  closedMessage: "Stalls have closed.",
  untagged: "a stall tag",
  stalls: [
    { tag: "stratford", name: "Stratford" },
    { tag: "angel", name: "Angel" },
    { tag: "bakerstreet", name: "Baker Street" },
    { tag: "brixton", name: "Brixton" },
    { tag: "waterloo", name: "Waterloo" },
    { tag: "londonbridge", name: "London Bridge" },
  ],
};

// Volunteer tracker: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: `Flyering tracker, ${RACE.date}`,
  robots: { index: false, follow: false },
};

export default async function FlyeringTrackerPage() {
  const tags = RACE.stalls.map((stall) => stall.tag);
  const [result, afterResult] = await getRaceCounts(RACE.eventApiId, tags, RACE.open, RACE.close);
  return <FlyeringTracker race={RACE} result={result} afterResult={afterResult} now={new Date()} />;
}
