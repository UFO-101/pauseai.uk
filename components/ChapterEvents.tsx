import type { ReactNode } from "react";
import EventList from "@/components/EventList";
import { chapters, type ChapterName } from "@/lib/data/chapters";
import { filterEventsForChapter, getEvents, type LumaEntry } from "@/lib/data/events";
import { site } from "@/lib/data/site";

// Enough to show a chapter is active without turning its page into an
// archive. EventList shows four and puts the rest behind "Show more".
const PAST_EVENTS_SHOWN = 8;

function EventsSection({
  id,
  heading,
  events,
  empty,
  showCalendarLink = false,
}: {
  id?: string;
  heading: string;
  events: LumaEntry[];
  empty?: ReactNode;
  showCalendarLink?: boolean;
}) {
  return (
    <section id={id} className="next-event">
      <div className="container">
        <div className="section-heading-row">
          <h2 className="section-heading">{heading}</h2>
          {showCalendarLink && (
            <a
              className="btn primary section-heading-cta"
              href={site.social.luma}
              target="_blank"
              rel="noreferrer"
            >
              View the full UK calendar →
            </a>
          )}
        </div>
        <EventList events={events} lumaUrl={site.social.luma} empty={empty} />
      </div>
    </section>
  );
}

/**
 * The chapter's slice of the UK Luma calendar, rendered with the same cards
 * as the homepage.
 *
 * Chapter pages used to say "we meet regularly" with the calendar reachable
 * only from the footer, so someone who arrived from pauseai.info/communities
 * had no way to see when anything was actually happening — or that the
 * chapter had been meeting all year.
 *
 * An async server component rather than a change to each page's own
 * signature: the pages stay synchronous and each one only adds this tag.
 */
export default async function ChapterEvents({ chapterName }: { chapterName: ChapterName }) {
  // Non-null: ChapterName only admits names that are in `chapters`.
  const chapter = chapters.find((c) => c.name === chapterName)!;

  const [future, past] = await Promise.all([getEvents("future"), getEvents("past")]);
  const upcoming = filterEventsForChapter(future, chapter.eventMatchers);
  const previous = filterEventsForChapter(past, chapter.eventMatchers).slice(0, PAST_EVENTS_SHOWN);

  return (
    <>
      <EventsSection
        id="events"
        heading={`Upcoming events in ${chapter.name}`}
        events={upcoming}
        showCalendarLink
        empty={
          <>
            Nothing is listed in {chapter.name} just now. See the UK-wide{" "}
            <a href={site.social.luma} target="_blank" rel="noreferrer">
              event calendar
            </a>{" "}
            for everything else we have coming up.
          </>
        }
      />

      {/* Only when there is something to show: a chapter that has not met yet
          should not open with an empty archive. */}
      {previous.length > 0 && (
        <EventsSection heading={`Past events in ${chapter.name}`} events={previous} />
      )}
    </>
  );
}
