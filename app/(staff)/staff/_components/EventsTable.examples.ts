import type { SearchedEvent } from "@/lib/server/staff-events";
import { findEvents } from "@/lib/staff-events-list";
import { eventsSearch } from "@/lib/staff-search";

// Example events for the events page's gallery entries and browser tests:
// two to come, one with a Google Doc and several hosts, one linked to their
// supporter, one not and one with no name, and one with no owner; and
// three past, one taken off Luma.

/** The moment the examples are seen at. */
export const exampleEventsNow = "2026-11-02T12:00:00.000Z";

export const exampleStaff = ["jo@pauseai.uk", "joseph@pauseai.uk", "sean@pauseai.uk"];

const event = (id: string, more: Partial<SearchedEvent>): SearchedEvent => ({
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
  hosts: [{ name: "Jane Smith", supporterId: 12 }],
  hostEmails: ["jane.smith@example.com"],
  ...more,
});

export const exampleEvents: SearchedEvent[] = [
  event("evt-protest", {
    doc: "https://docs.google.com/document/d/example-protest-plan/edit",
    hosts: [
      { name: "Jane Smith", supporterId: 12 },
      { name: "John Smith", supporterId: null },
      { name: "", supporterId: 14 },
    ],
    hostEmails: ["jane.smith@example.com", "john.smith@example.com", "host.with.no.name@example.com"],
  }),
  event("evt-oxford-talk", {
    name: "AI risk talk",
    startAt: "2026-12-02T19:00:00.000Z",
    city: "Oxford",
    tags: ["Oxford"],
    going: 7,
    owner: null,
  }),
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
  event("evt-march", { name: "PauseAI London March", startAt: "2025-02-14T12:00:00.000Z", going: 130 }),
];

/** The events list's search for a tab, its filters and sort as typed, and the events it finds of the examples. */
export function exampleEventsTab(params: Parameters<typeof eventsSearch>[0] = {}) {
  const { filter, ...search } = eventsSearch(params);
  return { search, found: findEvents(exampleEvents, filter, exampleEventsNow) };
}
