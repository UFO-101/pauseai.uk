// The events lists, local group pages, people's stories and the volunteer
// tools' index (components/events/, local-groups/, people/ and tools/).
import EventList from "@/components/events/EventList";
import { exampleEvent } from "@/components/events/EventList.examples";
import EventsSection from "@/components/events/EventsSection";
import { Button } from "@/components/ui/Button";
import LocalGroupEvents from "@/components/events/LocalGroupEvents";
import UpcomingEvents from "@/components/events/UpcomingEvents";
import LocalGroupPage from "@/components/local-groups/LocalGroupPage";
import Avatar from "@/components/people/Avatar";
import PersonCard from "@/components/people/PersonCard";
import StoryBody from "@/components/people/StoryBody";
import StoryShareForm from "@/components/people/StoryShareForm";
import { CardIndex, IndexCard } from "@/components/tools/CardIndex";
import { localGroupPages } from "@/lib/content/local-group-pages";
import { isLongStory, people } from "@/lib/content/people";
import { site } from "@/lib/content/site";
import type { Group } from "../_components/types";

const WITH_PHOTO = people.find((person) => person.imageSrc && person.name)!;
const NO_PHOTO = people.find((person) => !person.imageSrc && person.name)!;
const ANONYMOUS = people.find((person) => !person.name)!;
const LONG = people.find((person) => isLongStory(person) && person.imageSrc)!;

const PLACES = ["London", "Manchester", "Scotland"];
const EVENTS = [1, 2, 3, 4, 5, 6].map((n) =>
  exampleEvent(n, n % 2 ? { geo_address_info: { city: PLACES[n % 3] } } : { name: `Online event ${n}` }),
);

const eventsGrid = { display: "grid", gap: 24 } as const;

export const areas: Group = {
  id: "areas",
  title: "Events, people, local groups and the tools index",
  examples: [
    {
      name: "EventsSection",
      file: "components/events/EventsSection.tsx",
      variants: [
        {
          label: "With a link to the calendar",
          render: () => (
            <EventsSection heading="Upcoming events" calendar={{ label: "See the calendar →", href: site.social.luma }}>
              <EventList events={EVENTS.slice(0, 2)} lumaUrl={site.social.luma} />
            </EventsSection>
          ),
        },
        {
          label: "With the list's buttons, and the calendar link as a ghost button",
          render: () => (
            <EventsSection
              heading="Upcoming events"
              actions={
                <Button variant="primary" size="small">
                  An example filter
                </Button>
              }
              calendar={{ label: "See the calendar →", href: site.social.luma, variant: "ghost" }}
            >
              <EventList events={EVENTS.slice(0, 2)} lumaUrl={site.social.luma} />
            </EventsSection>
          ),
        },
        {
          label: "A heading alone",
          render: () => (
            <EventsSection heading="Past events">
              <EventList events={EVENTS.slice(2, 4)} lumaUrl={site.social.luma} />
            </EventsSection>
          ),
        },
      ],
    },
    {
      name: "EventList",
      file: "components/events/EventList.tsx",
      variants: [
        {
          label: "One event",
          render: () => (
            <div className="container">
              <EventList events={EVENTS.slice(0, 1)} lumaUrl={site.social.luma} />
            </div>
          ),
        },
        {
          label: "Many: four, the rest behind Show more on a desktop",
          render: () => (
            <div className="container">
              <EventList events={EVENTS} lumaUrl={site.social.luma} />
            </div>
          ),
        },
        {
          label: "Many, all shown",
          render: () => (
            <div className="container">
              <EventList events={EVENTS} lumaUrl={site.social.luma} showAll />
            </div>
          ),
        },
        {
          label: "None: the calendar, or a line of its own",
          render: () => (
            <div className="container" style={eventsGrid}>
              <EventList events={[]} lumaUrl={site.social.luma} />
              <EventList events={[]} lumaUrl={site.social.luma} empty="Nothing is listed in Example Town just now." />
            </div>
          ),
        },
      ],
    },
    {
      name: "UpcomingEvents",
      file: "components/events/UpcomingEvents.tsx",
      variants: [
        { label: "No events", render: () => <UpcomingEvents events={[]} /> },
        { label: "One event", render: () => <UpcomingEvents events={EVENTS.slice(0, 1)} /> },
        { label: "More than fit, with a button for the rest", render: () => <UpcomingEvents events={EVENTS} /> },
      ],
    },
    {
      name: "LocalGroupEvents",
      file: "components/events/LocalGroupEvents.tsx",
      variants: [
        { label: "Upcoming and past", render: () => <LocalGroupEvents localGroupName="London" />, server: true },
        { label: "Nothing upcoming", render: () => <LocalGroupEvents localGroupName="Scotland" />, server: true },
      ],
    },
    {
      name: "LocalGroupPage",
      file: "components/local-groups/LocalGroupPage.tsx",
      variants: [
        {
          label: "Events, what we've done and contact, no badge",
          render: () => <LocalGroupPage content={localGroupPages.Scotland} />,
          server: true,
        },
        {
          label: "Events, what we do, what we've done and contact, with a badge",
          render: () => <LocalGroupPage content={localGroupPages.Leicester} />,
          server: true,
        },
      ],
    },
    {
      name: "Avatar",
      file: "components/people/Avatar.tsx",
      variants: [
        {
          label: "A photo, initials and the pause symbol, small",
          render: () => (
            <div className="container" style={{ display: "flex", gap: 16 }}>
              <Avatar person={WITH_PHOTO} />
              <Avatar person={NO_PHOTO} />
              <Avatar person={ANONYMOUS} />
            </div>
          ),
        },
        {
          label: "Large",
          render: () => (
            <div className="container" style={{ display: "flex", gap: 16 }}>
              <Avatar person={WITH_PHOTO} large />
              <Avatar person={NO_PHOTO} large />
              <Avatar person={ANONYMOUS} large />
            </div>
          ),
        },
      ],
    },
    {
      name: "PersonCard",
      file: "components/people/PersonCard.tsx",
      variants: [
        {
          label: "The whole story",
          render: () => (
            <div className="container" style={{ maxWidth: 640 }}>
              <PersonCard person={WITH_PHOTO} />
            </div>
          ),
        },
        {
          label: "An excerpt by length, with Read more",
          render: () => (
            <div className="container" style={{ maxWidth: 640 }}>
              <PersonCard person={LONG} truncate maxChars={300} />
            </div>
          ),
        },
        {
          label: "A carousel slide, cut to its height",
          render: () => (
            <div className="container">
              <PersonCard person={LONG} truncate slide />
            </div>
          ),
        },
        {
          label: "Anonymous, with a link to the whole story",
          render: () => (
            <div className="container" style={{ maxWidth: 640 }}>
              <PersonCard person={ANONYMOUS} showLink />
            </div>
          ),
        },
      ],
    },
    {
      name: "StoryBody",
      file: "components/people/StoryBody.tsx",
      variants: [
        {
          label: "Paragraphs and a list",
          render: () => (
            <div className="container" style={{ maxWidth: 640 }}>
              <StoryBody>
                <p>An example story&rsquo;s first paragraph, a sentence or two long.</p>
                <ul>
                  <li>A point in a list</li>
                  <li>Another point</li>
                </ul>
                <p>A closing paragraph.</p>
              </StoryBody>
            </div>
          ),
        },
        {
          label: "Clamped to a card's height",
          render: () => (
            <div className="container" style={{ maxWidth: 640 }}>
              <StoryBody clamped>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <p key={n}>Paragraph {n} of an example story, long enough to run past the height of a card.</p>
                ))}
              </StoryBody>
            </div>
          ),
        },
      ],
    },
    {
      name: "StoryShareForm",
      file: "components/people/StoryShareForm.tsx",
      variants: [
        {
          label: "The embedded form, its top",
          render: () => (
            <div className="container" style={{ maxHeight: 600, overflow: "hidden" }}>
              <StoryShareForm />
            </div>
          ),
        },
      ],
    },
    {
      name: "CardIndex",
      file: "components/tools/CardIndex.tsx",
      variants: [
        {
          label: "A title and a lede over the cards",
          render: () => (
            <CardIndex title="Example Tools" lede="A line about what these are for.">
              <IndexCard href="/events" title="An example tool" cta="Open →">
                <p>A line or two about it.</p>
              </IndexCard>
              <IndexCard href="https://example.org/" title="Another, elsewhere" cta="Visit →" external>
                <p>It opens in a new tab.</p>
              </IndexCard>
            </CardIndex>
          ),
        },
      ],
    },
    {
      name: "IndexCard",
      file: "components/tools/CardIndex.tsx",
      variants: [
        {
          label: "A page here, and another site",
          render: () => (
            <div className="container">
              <ul style={{ ...eventsGrid, listStyle: "none", padding: 0, maxWidth: 420 }}>
                <IndexCard href="/donate" title="An example card" cta="Go →">
                  <p>A line or two about it.</p>
                </IndexCard>
                <IndexCard href="https://example.org/" title="An external card" cta="Visit →" external>
                  <p>It opens in a new tab.</p>
                </IndexCard>
              </ul>
            </div>
          ),
        },
      ],
    },
  ],
};
