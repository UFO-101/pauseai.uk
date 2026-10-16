import EventsSection from "@/components/events/EventsSection";
import EventList from "@/components/events/EventList";
import type { LumaEntry } from "@/lib/events";
import { site } from "@/lib/content/site";

// The next few events from the Luma calendar.
export default function UpcomingEvents({ events }: { events: LumaEntry[] }) {
  return (
    <EventsSection
      id="events"
      heading="Upcoming events"
      calendar={{ label: "View full calendar →", href: site.social.luma }}
    >
      <EventList events={events} lumaUrl={site.social.luma} />
    </EventsSection>
  );
}
