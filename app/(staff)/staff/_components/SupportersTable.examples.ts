import type { ContactPermission } from "@/lib/contact-permissions";
import type { SupporterDetails, SupporterRow, SupporterSummary } from "@/lib/supporters";

/**
 * A supporter known from Luma and a letter: two emails, a phone, registered
 * twice, opted out of the calendar's emails; the phone, given to Luma, is
 * one we may use only while she follows the calendar, so we may not.
 */
export const exampleSupporter: SupporterSummary = {
  id: 7,
  name: "Jane Example",
  emails: ["jane@example.com", "jane.e@example.org"],
  phones: ["+447700900001"],
  postcode: "M1 1AE",
  sources: ["email-your-mp", "luma"],
  lumaContact: true,
  firstSeenAt: "2026-03-01T10:00:00Z",
  lastActiveAt: "2026-10-12T18:30:00Z",
  events: 2,
  letters: 1,
  member: false,
};

/** Everything a supporter's page shows, for Jane. */
export const exampleSupporterDetails: SupporterDetails = {
  summary: {
    ...exampleSupporter,
    place: {
      name: "Manchester",
      basis: "postcode",
      given: "M1 1AE",
      country: "england",
      latitude: 53.4794,
      longitude: -2.2353,
    },
  },
  mp: { id: 1, name: "Polly Placeholder", constituency: "Manchester Central", party: "Labour (Co-op)" },
  letters: [
    {
      id: 12,
      sentAt: "2026-10-05T09:00:00Z",
      mpName: "Polly Placeholder",
      politicianId: 1,
      campaign: "regulate-letter-pm",
      campaignTitle: "Regulate AI developers now",
      status: "sent",
    },
  ],
  identities: [
    { source: "luma", email: "jane@example.com", name: "Jane", seenAt: "2026-03-01T10:00:00Z" },
    { source: "email-your-mp", email: "jane.e@example.org", name: "Jane Example", seenAt: "2026-10-05T09:00:00Z" },
  ],
  contacts: [
    {
      source: "email-your-mp",
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
  activity: [
    {
      source: "luma-webhook",
      at: "2026-10-12T18:30:00Z",
      kind: "opted-out",
      title: "luma-calendar",
      campaignTitle: null,
      detail: "jane@example.com",
      href: null,
      status: null,
    },
    {
      source: "email-your-mp",
      at: "2026-10-06T11:00:00Z",
      kind: "letter-replied",
      title: "regulate-letter-pm",
      campaignTitle: "Regulate AI developers now",
      detail: "Polly Placeholder",
      href: "/staff/politicians/1",
      status: null,
    },
    {
      source: "email-your-mp",
      at: "2026-10-05T09:00:00Z",
      kind: "letter",
      title: "regulate-letter-pm",
      campaignTitle: "Regulate AI developers now",
      detail: "Polly Placeholder",
      href: "/staff/politicians/1",
      status: "sent",
    },
    {
      source: "luma",
      at: "2026-09-20T10:00:00Z",
      kind: "luma-registered",
      title: "PauseAI Manchester Social",
      campaignTitle: null,
      detail: "approved",
      href: "https://luma.com/fixture-manchester-social",
      status: null,
    },
    {
      source: "luma",
      at: "2026-03-01T10:00:00Z",
      kind: "luma-contact",
      title: null,
      campaignTitle: null,
      detail: null,
      href: null,
      status: null,
    },
  ],
  permissions: [
    {
      topic: "luma-calendar",
      channel: "email",
      address: "jane@example.com",
      send: "no",
      reason: "unsubscribed",
      at: "2026-10-12T18:30:00Z",
      source: "luma-webhook",
    },
    {
      topic: "site-forms",
      channel: "email",
      address: "jane@example.com",
      send: "yes",
      reason: "asked",
      at: "2026-10-05T09:00:00Z",
      source: "email-your-mp",
    },
    {
      topic: "luma-calendar",
      channel: "phone",
      address: "+447700900001",
      send: "no",
      reason: "unsubscribed",
      at: "2026-10-12T18:30:00Z",
      source: "luma",
    },
  ],
};

/** A member who joined through our site wanting to volunteer, opted out of the updates on joining, then re-joined asking for them; never a contact of the Luma calendar. */
export const exampleMemberDetails: SupporterDetails = {
  mp: null,
  letters: [],
  summary: {
    ...exampleSupporter,
    id: 8,
    name: "Rhea Member",
    emails: ["rhea@example.com"],
    phones: ["+447700900002"],
    postcode: null,
    sources: ["member"],
    lumaContact: false,
    events: 0,
    letters: 0,
    member: true,
  },
  identities: [{ source: "member", email: "rhea@example.com", name: "Rhea Member", seenAt: "2026-07-10T00:00:00Z" }],
  contacts: [
    {
      source: "member",
      at: "2026-10-11T08:00:00Z",
      phone: "+447700900002",
      postcode: null,
      latitude: null,
      longitude: null,
      city: "Cardiff",
    },
  ],
  activity: [
    {
      source: "member",
      at: "2026-07-10T00:00:00Z",
      kind: "member-joined",
      title: "Volunteer",
      campaignTitle: null,
      detail: "pauseai.uk",
      href: "https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/recRhea",
      status: null,
    },
  ],
  permissions: [
    {
      topic: "luma-calendar",
      channel: "email",
      address: "rhea@example.com",
      send: "no",
      reason: "not-following",
      at: null,
      source: null,
    },
    {
      topic: "pauseai-updates",
      channel: "email",
      address: "rhea@example.com",
      send: "unsure",
      reason: "asked",
      at: "2026-10-11T08:00:00Z",
      source: "member",
    },
    {
      topic: "volunteering",
      channel: "phone",
      address: "+447700900002",
      send: "yes",
      reason: "volunteered",
      at: "2026-07-10T00:00:00Z",
      source: "member",
    },
  ],
};

/** A supporter whose only address is blocked: they marked a letter as spam. */
export const exampleBlockedPermissions: ContactPermission[] = (["luma-calendar", "site-forms"] as const).map(
  (topic) => ({
    topic,
    channel: "email",
    address: "gus@example.com",
    send: "no",
    reason: "blocked",
    at: "2026-10-05T12:00:00Z",
    source: "complaint",
  }),
);

/** Rows of the list: Jane, unsubscribed from the calendar's emails but agreed on her letter; Sam, a member who volunteered with a phone and a contact of the calendar since before its webhook; Gus, blocked. */
export const exampleSupporterRows: SupporterRow[] = [
  { ...exampleSupporter, permissions: exampleSupporterDetails.permissions },
  {
    ...exampleSupporter,
    id: 8,
    name: null,
    emails: ["sam@example.com"],
    phones: ["+447700900003"],
    postcode: null,
    sources: ["luma", "member"],
    events: 0,
    letters: 0,
    member: true,
    permissions: [
      {
        topic: "luma-calendar",
        channel: "email",
        address: "sam@example.com",
        send: "yes",
        reason: "following",
        at: "2026-09-20T00:00:00Z",
        source: "luma",
      },
      {
        topic: "pauseai-updates",
        channel: "email",
        address: "sam@example.com",
        send: "unsure",
        reason: "asked",
        at: "2026-09-12T00:00:00Z",
        source: "member",
      },
      {
        topic: "volunteering",
        channel: "phone",
        address: "+447700900003",
        send: "yes",
        reason: "volunteered",
        at: "2026-09-12T00:00:00Z",
        source: "member",
      },
    ],
  },
  {
    ...exampleSupporter,
    id: 9,
    name: "Gus Blocked",
    emails: ["gus@example.com"],
    sources: ["email-your-mp"],
    lumaContact: false,
    events: 0,
    permissions: exampleBlockedPermissions,
  },
];
