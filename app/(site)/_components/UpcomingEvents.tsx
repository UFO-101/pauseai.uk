import { ButtonAnchor } from "@/components/ui/Button";
import EventList from "@/components/events/EventList";
import type { LumaEntry } from "@/lib/events";
import { site } from "@/lib/content/site";

// The next few events from the Luma calendar.
export default function UpcomingEvents({ events }: { events: LumaEntry[] }) {
  return (
    <section id="events" className="next-event">
      <div className="container">
        <div className="section-heading-row">
          <h2 className="section-heading">Upcoming events</h2>
          <ButtonAnchor
            variant="primary"
            className="section-heading-cta"
            href={site.social.luma}
            target="_blank"
            rel="noreferrer"
          >
            View full calendar →
          </ButtonAnchor>
        </div>
        <EventList events={events} lumaUrl={site.social.luma} />
      </div>
    </section>
  );
}
