import type { Mailing, MailingSummary } from "@/lib/server/mailings";

/** A mailing copied from Airtable, with an ask, sent, one bounce and a reply; one with no ask, not sent yet. */
export const exampleMailings: MailingSummary[] = [
  {
    id: 3,
    title: "Ben Lake October 2026 Debate",
    ask: null,
    askTitle: null,
    imported: false,
    sentAt: null,
    sent: 0,
    skipped: 0,
    bounced: 0,
    replied: 0,
  },
  {
    id: 2,
    title: "Edinburgh Conference Nov 26 Invitation",
    ask: "edinburgh-conference-2026",
    askTitle: "Edinburgh conference",
    imported: true,
    sentAt: "2026-10-01T09:00:00Z",
    sent: 2,
    skipped: 1,
    bounced: 1,
    replied: 1,
  },
];

/** The Edinburgh invitation, with its recipients: one personalised who replied, one that bounced, one left out. */
export const exampleMailing: Mailing = {
  ...exampleMailings[1],
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
    },
    {
      letterId: 12,
      politicianId: 8,
      name: "Morag Example",
      status: "bounced",
      sentAt: "2026-10-01T09:00:00Z",
      repliedAt: null,
      personalised: false,
    },
    {
      letterId: 13,
      politicianId: 9,
      name: "Dora Dummy",
      status: "not_sent",
      sentAt: null,
      repliedAt: null,
      personalised: false,
    },
  ],
};
