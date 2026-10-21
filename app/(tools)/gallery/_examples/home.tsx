// The home page's sections (app/(site)/_components/).
import GetInvolved from "@/app/(site)/_components/GetInvolved";
import HomeEvents from "@/app/(site)/_components/HomeEvents";
import HeroMarqueeEffects from "@/app/(site)/_components/HeroMarqueeEffects";
import HomeHero from "@/app/(site)/_components/HomeHero";
import JoinSection from "@/app/(site)/_components/JoinSection";
import LocalGroupsMap from "@/app/(site)/_components/LocalGroupsMap";
import LocalGroupsSection from "@/app/(site)/_components/LocalGroupsSection";
import OnboardingFormEmbed from "@/app/(site)/_components/OnboardingFormEmbed";
import PeopleCarousel from "@/app/(site)/_components/PeopleCarousel";
import PeopleSection from "@/app/(site)/_components/PeopleSection";
import PressMarquee, { NewsRow } from "@/app/(site)/_components/PressMarquee";
import ShopBanner from "@/app/(site)/_components/ShopBanner";
import StaffSection from "@/app/(site)/_components/StaffSection";
import { people } from "@/lib/content/people";
import { newsRow1, newsRow2 } from "@/lib/content/press-coverage";
import type { LumaEvent } from "@/lib/events";
import type { Group } from "../_components/types";
import { EventsPlacePickerExample } from "./home.client";

// More than the four the list shows before "show more": in person, online, and in several towns.
const MANY_EVENTS: LumaEvent[] = [
  { url: "evt", name: "A meetup", start_at: "2030-01-01T18:00:00Z" },
  { url: "evt-online", name: "An online meeting", start_at: "2030-01-03T19:00:00Z", location_type: "zoom" },
  {
    url: "evt-london",
    name: "An example protest",
    start_at: "2030-01-05T13:00:00Z",
    timezone: "Europe/London",
    geo_address_info: { city: "London", address: "Example Square, London" },
  },
  {
    url: "evt-manchester",
    name: "An example social",
    start_at: "2030-01-08T18:30:00Z",
    geo_address_info: { city: "Manchester" },
  },
  {
    url: "evt-bristol",
    name: "An example talk",
    start_at: "2030-01-12T18:00:00Z",
    geo_address_info: { city: "Bristol" },
  },
  { url: "evt-later", name: "A later meetup", start_at: "2030-02-01T18:00:00Z" },
];

export const home: Group = {
  id: "home",
  title: "The home page",
  examples: [
    {
      name: "HomeHero",
      file: "app/(site)/_components/HomeHero.tsx",
      variants: [{ label: "Three rows of photos under the title", render: () => <HomeHero /> }],
    },
    {
      name: "HeroMarqueeEffects",
      file: "app/(site)/_components/HeroMarqueeEffects.tsx",
      variants: [
        {
          label: "Renders nothing visible: sets each marquee's scroll distance on this page",
          render: () => (
            <div className="container">
              <HeroMarqueeEffects />
              <p>Nothing to see: it measures the scrolling rows of photos and logos above and below.</p>
            </div>
          ),
        },
      ],
    },
    {
      name: "HomeEvents",
      file: "app/(site)/_components/HomeEvents.tsx",
      variants: [
        { label: "Every event, until a place is chosen", render: () => <HomeEvents events={MANY_EVENTS} /> },
        { label: "No events", render: () => <HomeEvents events={[]} /> },
      ],
    },
    {
      name: "EventsPlacePicker",
      file: "app/(site)/_components/EventsPlacePicker.tsx",
      variants: [
        { label: "Anywhere chosen", render: () => <EventsPlacePickerExample /> },
        { label: "A local group chosen", render: () => <EventsPlacePickerExample group="London" /> },
      ],
    },
    {
      name: "PressMarquee",
      file: "app/(site)/_components/PressMarquee.tsx",
      variants: [{ label: "Two rows on a desktop, three on a phone", render: () => <PressMarquee /> }],
    },
    {
      name: "NewsRow",
      file: "app/(site)/_components/PressMarquee.tsx",
      variants: [
        { label: "Scrolling left", render: () => <NewsRow items={newsRow1} /> },
        { label: "Scrolling right", render: () => <NewsRow items={newsRow2} reverse /> },
      ],
    },
    {
      name: "LocalGroupsSection",
      file: "app/(site)/_components/LocalGroupsSection.tsx",
      variants: [{ label: "The map, and how to start a group", render: () => <LocalGroupsSection /> }],
    },
    {
      name: "LocalGroupsMap",
      file: "app/(site)/_components/LocalGroupsMap.tsx",
      variants: [
        {
          label: "Cards, with the UK map beside them on a wide screen",
          render: () => (
            <div className="container">
              <LocalGroupsMap />
            </div>
          ),
        },
      ],
    },
    {
      name: "PeopleSection",
      file: "app/(site)/_components/PeopleSection.tsx",
      variants: [{ label: "Every story, in a carousel", render: () => <PeopleSection /> }],
    },
    {
      name: "PeopleCarousel",
      file: "app/(site)/_components/PeopleCarousel.tsx",
      variants: [
        { label: "Two stories", render: () => <PeopleCarousel people={people.slice(0, 2)} /> },
        { label: "Every story", render: () => <PeopleCarousel people={people} /> },
      ],
    },
    {
      name: "ShopBanner",
      file: "app/(site)/_components/ShopBanner.tsx",
      variants: [{ label: "A link to the shop", render: () => <ShopBanner /> }],
    },
    {
      name: "JoinSection",
      file: "app/(site)/_components/JoinSection.tsx",
      variants: [{ label: "A heading over the form", render: () => <JoinSection /> }],
    },
    {
      name: "OnboardingFormEmbed",
      file: "app/(site)/_components/OnboardingFormEmbed.tsx",
      variants: [
        {
          label: "The embedded form alone",
          render: () => (
            <div className="container">
              <OnboardingFormEmbed />
            </div>
          ),
        },
      ],
    },
    {
      name: "GetInvolved",
      file: "app/(site)/_components/GetInvolved.tsx",
      variants: [{ label: "Ways to get involved", render: () => <GetInvolved /> }],
    },
    {
      name: "StaffSection",
      file: "app/(site)/_components/StaffSection.tsx",
      variants: [{ label: "The staff, and a link to the jobs", render: () => <StaffSection /> }],
    },
  ],
};
