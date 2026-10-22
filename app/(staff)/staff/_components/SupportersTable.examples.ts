import type { EmailPermission } from "@/lib/email-permissions";
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
  member: false,
};

/** Everything a supporter's page shows, for Jane. */
export const exampleSupporterDetails: SupporterDetails = {
  summary: exampleSupporter,
  identities: [
    { source: "luma", email: "jane@example.com", name: "Jane", seenAt: "2026-03-01T10:00:00Z" },
    { source: "letter", email: "jane.e@example.org", name: "Jane Example", seenAt: "2026-10-05T09:00:00Z" },
  ],
  contacts: [
    {
      source: "letter",
      at: "2026-10-05T09:00:00Z",
      phone: null,
      postcode: "M1 1AE",
      latitude: null,
      longitude: null,
      city: null,
    },
    {
      source: "luma",
      at: "2026-09-20T10:00:00Z",
      phone: "+447700900001",
      postcode: "M2 2BB",
      latitude: 53.4794,
      longitude: -2.2453,
      city: "Manchester",
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
      status: null,
    },
    {
      source: "letter",
      at: "2026-10-06T11:00:00Z",
      kind: "letter-replied",
      title: "regulate-letter-pm",
      detail: "Polly Placeholder",
      href: "/staff/politicians/1",
      status: null,
    },
    {
      source: "letter",
      at: "2026-10-05T09:00:00Z",
      kind: "letter",
      title: "regulate-letter-pm",
      detail: "Polly Placeholder",
      href: "/staff/politicians/1",
      status: "sent",
    },
    {
      source: "luma",
      at: "2026-09-20T10:00:00Z",
      kind: "luma-registered",
      title: "PauseAI Manchester Social",
      detail: "approved",
      href: "https://luma.com/fixture-manchester-social",
      status: null,
    },
    {
      source: "luma",
      at: "2026-03-01T10:00:00Z",
      kind: "luma-contact",
      title: null,
      detail: null,
      href: null,
      status: null,
    },
  ],
  permissions: [
    {
      topic: "luma-calendar",
      address: "jane@example.com",
      send: "no",
      reason: "unsubscribed",
      at: "2026-10-12T18:30:00Z",
      source: "luma-webhook",
    },
    {
      topic: "events-and-ways-to-help",
      address: "jane@example.com",
      send: "yes",
      reason: "asked",
      at: "2026-10-05T09:00:00Z",
      source: "letter",
    },
  ],
};

/** A member who joined through our site wanting to volunteer, opted out of the updates on joining, then re-joined asking for them; never followed the calendar. */
export const exampleMemberDetails: SupporterDetails = {
  summary: {
    ...exampleSupporter,
    id: 8,
    name: "Rhea Member",
    emails: ["rhea@example.com"],
    phone: null,
    postcode: null,
    sources: ["member"],
    lumaContact: false,
    events: 0,
    letters: 0,
    optedOut: [],
    member: true,
  },
  identities: [{ source: "member", email: "rhea@example.com", name: "Rhea Member", seenAt: "2026-07-10T00:00:00Z" }],
  contacts: [
    {
      source: "member",
      at: "2026-10-11T08:00:00Z",
      phone: null,
      postcode: null,
      latitude: null,
      longitude: null,
      city: "Cardiff",
    },
  ],
  links: [
    {
      source: "member",
      sourceId: "recRhea",
      matchedBy: "email",
      matchedValue: "rhea@example.com",
      linkedAt: "2026-10-11T08:47:00Z",
    },
  ],
  activity: [
    {
      source: "airtable-import",
      at: "2026-10-11T08:00:00Z",
      kind: "resubscribed",
      title: "pauseai-updates",
      detail: "rhea@example.com",
      href: null,
      status: null,
    },
    {
      source: "airtable-import",
      at: "2026-07-10T00:00:00Z",
      kind: "opted-out",
      title: "pauseai-updates",
      detail: "rhea@example.com",
      href: null,
      status: null,
    },
    {
      source: "member",
      at: "2026-07-10T00:00:00Z",
      kind: "member-joined",
      title: "Volunteer",
      detail: "pauseai.uk",
      href: "https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/recRhea",
      status: null,
    },
  ],
  permissions: [
    {
      topic: "luma-calendar",
      address: "rhea@example.com",
      send: "no",
      reason: "not-following",
      at: null,
      source: null,
    },
    {
      topic: "pauseai-updates",
      address: "rhea@example.com",
      send: "unsure",
      reason: "asked",
      at: "2026-10-11T08:00:00Z",
      source: "member",
    },
  ],
};

/** A supporter whose only address is blocked: they marked a letter as spam. */
export const exampleBlockedPermissions: EmailPermission[] = (["luma-calendar", "events-and-ways-to-help"] as const).map(
  (topic) => ({
    topic,
    address: "gus@example.com",
    send: "no",
    reason: "blocked",
    at: "2026-10-05T12:00:00Z",
    source: "complaint",
  }),
);
