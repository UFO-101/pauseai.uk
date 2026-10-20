import { pageMetadata } from "@/lib/metadata";
import EventList from "@/components/events/EventList";
import { getEvents } from "@/lib/server/outside-services/luma-calendar";
import { site } from "@/lib/content/site";
import EventsSection from "@/components/events/EventsSection";
import PageHero from "@/components/ui/PageHero";
import FindYourGroup from "./_components/FindYourGroup";

// A short, readable address for our events, used on printed collateral. The calendar itself lives on Luma,
// so this page lists it (via getEvents, cached for an hour) and links through to subscribe.
export const metadata = pageMetadata({
  title: "Events",
  description:
    "Upcoming PauseAI UK events: meetups, talks, letter writing and protests, in person across the UK and online.",
  path: "/events",
  openGraph: { title: "PauseAI UK events" },
});

export default async function EventsPage() {
  const events = await getEvents("future");
  return (
    <>
      <main>
        <PageHero
          title="Events"
          lede="Meet other people worried about AI, write to your MP, and take action together. Everything here is free and open to everyone."
        />

        <EventsSection heading="Upcoming events" calendar={{ label: "Subscribe on Luma →", href: site.social.luma }}>
          <EventList events={events} lumaUrl={site.social.luma} showAll />
          <FindYourGroup />
        </EventsSection>
      </main>
    </>
  );
}
