import type { Mailing, MailingSummary } from "@/lib/server/mailings";

/** What every mailing has, for the examples to change. */
const mailing: MailingSummary = {
  id: 1,
  title: "",
  ask: null,
  askTitle: null,
  imported: false,
  state: "sent",
  createdBy: null,
  fromName: null,
  dueAt: null,
  updatedAt: "2026-10-28T10:00:00Z",
  to: 0,
  sentAt: null,
  sent: 0,
  skipped: 0,
  bounced: 0,
  replied: 0,
  answered: 0,
};

/**
 * A mailing written here, sent from Jo with an ask, a bounce, two replies
 * and three answers; one copied from Airtable, with an ask, one bounce and
 * a reply; one with no ask, not sent yet.
 */
export const exampleMailings: MailingSummary[] = [
  {
    ...mailing,
    id: 4,
    title: "Invitation: AI safety conference, Edinburgh",
    ask: "edinburgh-conference-2026",
    askTitle: "Edinburgh conference",
    createdBy: "jo@pauseai.uk",
    fromName: "Jo Example",
    dueAt: "2026-10-20T08:00:00Z",
    to: 12,
    sentAt: "2026-10-20T08:00:00Z",
    sent: 11,
    skipped: 1,
    bounced: 1,
    replied: 2,
    answered: 3,
  },
  { ...mailing, id: 3, title: "Ben Lake October 2026 Debate", imported: false },
  {
    ...mailing,
    id: 2,
    title: "Edinburgh Conference Nov 26 Invitation",
    ask: "edinburgh-conference-2026",
    askTitle: "Edinburgh conference",
    imported: true,
    to: 4,
    sentAt: "2026-10-01T09:00:00Z",
    sent: 2,
    skipped: 1,
    bounced: 1,
    replied: 1,
    answered: 1,
  },
];

/** A draft to the Commons, and one scheduled for Thursday, written by Jo. */
export const exampleDraft: MailingSummary = {
  ...mailing,
  id: 5,
  title: "Meet us in Westminster",
  state: "draft",
  createdBy: "jo@pauseai.uk",
  to: 412,
};
export const exampleScheduled: MailingSummary = {
  ...mailing,
  id: 6,
  title: "Edinburgh: one week to go",
  state: "scheduled",
  createdBy: "jo@pauseai.uk",
  fromName: "Jo Example",
  dueAt: "2026-10-30T09:00:00Z",
  to: 72,
};

/** The Edinburgh invitation, with its recipients: one personalised who replied, one that bounced, one left out. */
export const exampleMailing: Mailing = {
  ...exampleMailings[2],
  tab: "all",
  recipientsTotal: 3,
  page: 1,
  pages: 1,
  pageSize: 100,
  recipients: [
    {
      letterId: 11,
      politicianId: 7,
      name: "Polly Placeholder",
      status: "sent",
      sentAt: "2026-10-01T09:00:00Z",
      repliedAt: "2026-10-03T14:00:00Z",
      personalised: true,
      answer: "going",
      skipReason: null,
    },
    {
      letterId: 12,
      politicianId: 8,
      name: "Morag Example",
      status: "bounced",
      sentAt: "2026-10-01T09:00:00Z",
      repliedAt: null,
      personalised: false,
      answer: null,
      skipReason: null,
    },
    {
      letterId: 13,
      politicianId: 9,
      name: "Dora Dummy",
      status: "not_sent",
      sentAt: null,
      repliedAt: null,
      personalised: false,
      answer: null,
      skipReason: null,
    },
  ],
};
