import EventList from "./EventList";
import EventsSection from "./EventsSection";
import { localGroups, type LocalGroupName } from "@/lib/content/local-groups";
import { filterEventsForLocalGroup } from "@/lib/events";
import { getEvents } from "@/lib/server/luma-calendar";
import { site } from "@/lib/content/site";

// Enough to show a local group is active without turning its page into an
// archive. EventList shows four and puts the rest behind "Show more".
const PAST_EVENTS_SHOWN = 8;

/**
 * The local group's slice of the UK Luma calendar, rendered with the same cards
 * as the homepage.
 *
 * So someone who arrives from pauseai.info/communities sees when the group
 * next meets, and that it's been meeting all year, without hunting for the
 * calendar.
 *
 * An async server component rather than a change to each page's own
 * signature: the pages stay synchronous and each one only adds this tag.
 */
export default async function LocalGroupEvents({ localGroupName }: { localGroupName: LocalGroupName }) {
  // Non-null: LocalGroupName only admits names that are in `localGroups`.
  const localGroup = localGroups.find((c) => c.name === localGroupName)!;

  const [future, past] = await Promise.all([getEvents("future"), getEvents("past")]);
  const upcoming = filterEventsForLocalGroup(future, localGroup.eventMatchers);
  const previous = filterEventsForLocalGroup(past, localGroup.eventMatchers).slice(0, PAST_EVENTS_SHOWN);

  return (
    <>
      <EventsSection
        id="events"
        heading={`Upcoming events in ${localGroup.name}`}
        calendar={{ label: "View the full UK calendar →", href: site.social.luma }}
      >
        <EventList
          events={upcoming}
          lumaUrl={site.social.luma}
          empty={
            <>
              Nothing is listed in {localGroup.name} just now. See the UK-wide{" "}
              <a href={site.social.luma} target="_blank" rel="noreferrer">
                event calendar
              </a>{" "}
              for everything else we have coming up.
            </>
          }
        />
      </EventsSection>

      {/* Only when there is something to show: a local group that has not met yet
          should not open with an empty archive. */}
      {previous.length > 0 && (
        <EventsSection heading={`Past events in ${localGroup.name}`} tone="cream">
          <EventList events={previous} lumaUrl={site.social.luma} />
        </EventsSection>
      )}
    </>
  );
}
