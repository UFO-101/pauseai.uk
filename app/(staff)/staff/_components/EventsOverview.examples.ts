import type { EventGroup, StaffEvent } from "@/lib/server/staff-events";

// Example events for the events page's gallery entries and browser tests:
// two coming up, one with a Google Doc and one with no owner; and three
// past, one taken off Luma.

/** The moment the examples are seen at. */
export const exampleEventsNow = "2026-11-02T12:00:00.000Z";

export const exampleStaff = ["jo@pauseai.uk", "joseph@pauseai.uk", "sean@pauseai.uk"];

const event = (id: string, more: Partial<StaffEvent>): StaffEvent => ({
  id,
  name: "PauseAI London: Protest at Parliament",
  url: `https://luma.com/${id}`,
  startAt: "2026-11-21T13:00:00.000Z",
  city: "London",
  tags: ["Big events", "London"],
  removed: false,
  going: 42,
  owner: "joseph@pauseai.uk",
  doc: null,
  ...more,
});

export const exampleEventGroups: EventGroup[] = [
  {
    key: "coming",
    heading: "Coming up",
    items: [
      event("evt-protest", { doc: "https://docs.google.com/document/d/example-protest-plan/edit" }),
      event("evt-oxford-talk", {
        name: "AI risk talk",
        startAt: "2026-12-02T19:00:00.000Z",
        city: "Oxford",
        tags: ["Oxford"],
        going: 7,
        owner: null,
      }),
    ],
  },
  {
    key: "2026-10",
    heading: "October 2026",
    items: [
      event("evt-training", {
        name: "Lobbying your MP (online training)",
        startAt: "2026-10-29T18:30:00.000Z",
        city: null,
        tags: ["Online"],
        going: 18,
        owner: "jo@pauseai.uk",
      }),
      event("evt-social", {
        name: "PauseAI Manchester Social",
        startAt: "2026-10-10T18:00:00.000Z",
        city: "Manchester",
        tags: [],
        removed: true,
        going: 0,
        owner: null,
      }),
    ],
  },
  {
    key: "2025",
    heading: "2025",
    items: [event("evt-march", { name: "PauseAI London March", startAt: "2025-02-14T12:00:00.000Z", going: 130 })],
  },
];
