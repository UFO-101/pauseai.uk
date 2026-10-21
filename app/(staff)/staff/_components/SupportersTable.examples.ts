import type { SupporterDetails, SupporterSummary } from "@/lib/supporters";

/** A supporter known from Luma and a letter: two emails, a phone, registered twice, opted out of the calendar's emails. */
export const exampleSupporter: SupporterSummary = {
  id: 7,
  name: "Jane Example",
  emails: ["jane@example.com", "jane.e@example.org"],
  phone: "+447700900001",
  postcode: "M1 1AE",
  sources: ["letter", "luma"],
  lumaContact: true,
  firstSeenAt: "2026-03-01T10:00:00Z",
  lastActiveAt: "2026-10-12T18:30:00Z",
  events: 2,
  letters: 1,
  optedOut: ["luma-calendar"],
};

/** Everything a supporter's page shows, for Jane. */
export const exampleSupporterDetails: SupporterDetails = {
  summary: exampleSupporter,
  identities: [
    { source: "luma", email: "jane@example.com", name: "Jane", seenAt: "2026-03-01T10:00:00Z" },
    { source: "letter", email: "jane.e@example.org", name: "Jane Example", seenAt: "2026-10-05T09:00:00Z" },
  ],
  contacts: [
    { source: "letter", at: "2026-10-05T09:00:00Z", phone: null, postcode: "M1 1AE", latitude: null, longitude: null },
    {
      source: "luma",
      at: "2026-09-20T10:00:00Z",
      phone: "+447700900001",
      postcode: "M2 2BB",
      latitude: 53.4794,
      longitude: -2.2453,
    },
  ],
  links: [
    {
      source: "luma",
      sourceId: "usr-example",
      matchedBy: "email",
      matchedValue: "jane@example.com",
      linkedAt: "2026-10-01T03:17:00Z",
    },
    {
      source: "letter",
      sourceId: "12",
      matchedBy: "email",
      matchedValue: "jane.e@example.org",
      linkedAt: "2026-10-05T09:00:00Z",
    },
  ],
  activity: [
    {
      source: "luma-webhook",
      at: "2026-10-12T18:30:00Z",
      kind: "opted-out",
      title: "luma-calendar",
      detail: "jane@example.com",
      href: null,
    },
    {
      source: "letter",
      at: "2026-10-06T11:00:00Z",
      kind: "letter-replied",
      title: "regulate-letter-pm",
      detail: "Polly Placeholder",
      href: "/staff/politicians/1",
    },
    {
      source: "letter",
      at: "2026-10-05T09:00:00Z",
      kind: "letter",
      title: "regulate-letter-pm",
      detail: "Polly Placeholder · sent",
      href: "/staff/letters",
    },
    {
      source: "luma",
      at: "2026-09-20T10:00:00Z",
      kind: "luma-registered",
      title: "PauseAI Manchester Social",
      detail: "approved",
      href: "https://luma.com/fixture-manchester-social",
    },
    { source: "luma", at: "2026-03-01T10:00:00Z", kind: "luma-contact", title: null, detail: null, href: null },
  ],
  optOuts: [
    { list: "luma-calendar", address: "jane@example.com", since: "2026-10-12T18:30:00Z", source: "luma-webhook" },
    { list: "luma-calendar", address: "jane.e@example.org", since: null, source: null },
  ],
};
