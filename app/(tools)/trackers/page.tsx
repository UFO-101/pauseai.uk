import type { Metadata } from "next";
import { CardIndex, IndexCard } from "@/components/tools/CardIndex";

// Volunteer area: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Trackers",
  description: "Live results from PauseAI UK volunteer activity days.",
  robots: { index: false, follow: false },
};

interface Tracker {
  href: string;
  title: string;
  date: string;
  description: string;
}

// Newest first.
const trackers: Tracker[] = [
  {
    href: "/trackers/2026-10-10-flyering",
    title: "Flyering team race",
    date: "10 October 2026",
    description:
      "Which team gets the most people signed up to the March Against AI Extinction, counted from each team's QR code.",
  },
  {
    href: "/trackers/2026-09-26-flyering",
    title: "Flyering stall race",
    date: "26 September 2026",
    description:
      "Which stall gets the most people signed up to the March Against the Machines, counted from each stall's QR code.",
  },
];

export default function TrackersPage() {
  return (
    <>
      <CardIndex title="Trackers" lede="Live results from our volunteer activity days.">
        {trackers.map((tracker) => (
          <IndexCard key={tracker.href} href={tracker.href} title={tracker.title} cta="Open →">
            <p>{tracker.date}</p>
            <p>{tracker.description}</p>
          </IndexCard>
        ))}
      </CardIndex>
    </>
  );
}
