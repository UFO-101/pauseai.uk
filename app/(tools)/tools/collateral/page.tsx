import type { Metadata } from "next";
import Link from "next/link";
import { toCalendarEvents } from "@/lib/collateral/eventText";
import { getEvents } from "@/lib/server/luma-calendar";
import CollateralApp from "./CollateralApp";
import "./collateral.css";

// Volunteer tool: unlisted, kept out of search results and the sitemap (see HIDDEN_ROUTES in app/sitemap.ts).
export const metadata: Metadata = {
  title: "Collateral maker",
  description: "Make on-brand flyers, event covers and social posts for PauseAI UK.",
  robots: { index: false, follow: false },
};

export default async function CollateralPage() {
  // Upcoming events from our Luma calendar, for "fill in from one of our events". Cached for an hour by getEvents.
  const events = toCalendarEvents(await getEvents("future"));
  return (
    <>
      <main className="collateral-page">
        <div className="container">
          <Link href="/tools" className="collateral-back">
            ← All tools
          </Link>
          <h1 className="collateral-title">Collateral maker</h1>
          <p className="collateral-lede">
            Make on-brand posts, flyers and event covers. Nothing leaves your browser. Just need a QR code? Use the{" "}
            <Link href="/tools/qr">QR code generator</Link>.
          </p>
          <CollateralApp events={events} />
        </div>
      </main>
    </>
  );
}
