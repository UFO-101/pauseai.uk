import { ButtonAnchor } from "@/components/ui/Button";
import EventList from "@/components/events/EventList";
import type { LumaEntry } from "@/lib/events";
import { site } from "@/lib/content/site";
import { march } from "@/lib/content/march";
import FeaturedEvent from "./FeaturedEvent";

// The next few events from the Luma calendar. While the march is promoted it
// leads, as a featured card, and isn't repeated in the list below it.
export default function UpcomingEvents({ events, featureMarch = false }: { events: LumaEntry[]; featureMarch?: boolean }) {
  const listed = featureMarch ? events.filter((entry) => entry.event.url !== march.lumaSlug) : events;
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
        {featureMarch && <FeaturedEvent />}
        <EventList events={listed} lumaUrl={site.social.luma} />
      </div>
    </section>
  );
}
