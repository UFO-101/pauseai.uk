import type { Metadata } from "next";
import Link from "next/link";
import EventList from "@/components/events/EventList";
import { getEvents } from "@/lib/server/luma-calendar";
import { site } from "@/lib/content/site";
import "../track-record/track-record.css";
import { ButtonAnchor } from "@/components/ui/Button";

// A short, readable address for our events, used on printed collateral. The calendar itself lives on Luma,
// so this page lists it (via getEvents, cached for an hour) and links through to subscribe.
export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming PauseAI UK events: meetups, talks, letter writing and protests, in person across the UK and online.",
  openGraph: {
    title: "PauseAI UK events",
    description: "Upcoming PauseAI UK events: meetups, talks, letter writing and protests, in person across the UK and online.",
    images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
    url: "https://pauseai.uk/events/",
  },
  twitter: {
    images: ["/images/open-graph/open-graph-1600-840.jpg"],
  },
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const events = await getEvents("future");
  return (
    <>
      <main className="track-record events-page">
        <section className="tr-hero">
          <div className="container tr-hero-inner">
            <h1 className="tr-hero-title">Events</h1>
            <p className="tr-hero-lede">
              Meet other people worried about AI, write to your MP, and take action together. Everything here is free and open to
              everyone.
            </p>
          </div>
        </section>

        <section className="next-event">
          <div className="container">
            <div className="section-heading-row">
              <h2 className="section-heading">Upcoming events</h2>
              <ButtonAnchor variant="primary" className="section-heading-cta" href={site.social.luma} target="_blank" rel="noreferrer">
                Subscribe on Luma →
              </ButtonAnchor>
            </div>
            <EventList events={events} lumaUrl={site.social.luma} showAll />
            <p className="events-page-note">
              Looking for something near you? <Link href="/#local-groups">Find your local group</Link>.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
