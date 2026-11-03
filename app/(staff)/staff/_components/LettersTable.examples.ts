import { campaigns } from "@/lib/content/email-your-mp";
import type { LetterSummary, PauseaiLetterDetails, SupporterLetterDetails } from "@/lib/server/letters";
import type { LettersSearch } from "@/lib/staff-search";

const [pm] = campaigns;

/** A letter to the test MP that bounced. */
export const exampleLetter: LetterSummary = {
  id: 1,
  campaign: pm.slug,
  campaignTitle: pm.title,
  campaignUrl: null,
  status: "bounced",
  senderName: "Jane Smith",
  senderEmail: "jane@example.com",
  contactConsent: true,
  mpName: "Testy McTestface MP",
  politicianId: 3,
  isTest: true,
  backend: "postmark",
  createdAt: "2026-10-12T09:00:00Z",
  sentAt: "2026-10-12T09:05:00Z",
  repliedAt: null,
  autoRepliedAt: null,
  supporterId: 7,
  events: [
    { at: "2026-10-12T09:10:00Z", status: "bounced", details: { type: "HardBounce" } },
    { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
  ],
};

/**
 * A supporter's letter, for its page: its subject, its MP's address, its
 * campaign making no ask, its send by Postmark recorded between the others,
 * and its copy in the mail of the policy inbox's members, as it went while
 * that was a Google Group, by Postmark's ID for the email.
 */
export const exampleSupporterLetterDetails: SupporterLetterDetails = {
  ...exampleLetter,
  kind: "supporter",
  subject: "Please back a pause on frontier AI",
  mpEmail: "testy.mctestface.mp@parliament.uk",
  campaignAsk: null,
  events: [
    exampleLetter.events[0],
    { at: "2026-10-12T09:05:00Z", status: "sent", details: { messageId: "0a1b2c3d-1111-2222-3333-444455556666" } },
    exampleLetter.events[1],
  ],
  gmail: {
    mailbox: "policy@pauseai.uk",
    search: "rfc822msgid:0a1b2c3d-1111-2222-3333-444455556666@mtasv.net",
    inPolicyGroup: true,
  },
  forwards: [],
  sent: null,
};

const LETTERS_INBOX = "fixture-letters@pauseai.uk";

/**
 * A supporter's letter from the letters inbox: Jane added a paragraph of
 * her own and cut a sentence of the campaign's draft; the letter went from
 * her proxy and her copy from it to the MP's; the MP's office replied to
 * her proxy, relayed to her, and she answered, relayed to the office.
 */
export const exampleProxiedLetterDetails: SupporterLetterDetails = {
  ...exampleSupporterLetterDetails,
  status: "sent",
  backend: "gmail",
  repliedAt: "2026-10-13T09:00:00Z",
  gmail: { mailbox: LETTERS_INBOX, search: "rfc822msgid:letter-1@pauseai.uk" },
  events: [
    {
      at: "2026-10-13T10:00:00Z",
      status: "relayed",
      details: {
        from: `"Jane Smith (via PauseAI)" <fixture-letters+jane.smith@pauseai.uk>`,
        to: "testy.mctestface.mp@parliament.uk",
      },
    },
    {
      at: "2026-10-13T10:00:00Z",
      status: "replied",
      details: { from: "jane@example.com", name: "Jane Smith", to: "fixture-letters+testy.mctestface.mp@pauseai.uk" },
    },
    {
      at: "2026-10-13T09:00:00Z",
      status: "relayed",
      details: {
        from: `"Testy McTestface MP (via PauseAI)" <fixture-letters+testy.mctestface.mp@pauseai.uk>`,
        to: "jane@example.com",
      },
    },
    {
      at: "2026-10-13T09:00:00Z",
      status: "replied",
      details: {
        from: "testy.mctestface.mp@parliament.uk",
        name: "Testy McTestface MP",
        to: "fixture-letters+jane.smith@pauseai.uk",
      },
    },
    {
      at: "2026-10-12T09:05:00Z",
      status: "copy_sent",
      details: {
        from: `"Jane Smith (via PauseAI)" <fixture-letters+jane.smith@pauseai.uk>`,
        to: `"Testy McTestface MP (via PauseAI)" <fixture-letters+testy.mctestface.mp@pauseai.uk>`,
        bcc: "jane@example.com",
      },
    },
    {
      at: "2026-10-12T09:05:00Z",
      status: "sent",
      details: {
        from: `"Jane Smith (via PauseAI)" <fixture-letters+jane.smith@pauseai.uk>`,
        to: "testy.mctestface.mp@parliament.uk",
      },
    },
  ],
  sent: {
    text: "Dear Mr McTestface,\n\nPlease back a pause on frontier AI. I live in Testville and I worry about my children's future.\n\nYours sincerely,\nJane Smith",
    draft:
      "Dear Mr McTestface,\n\nPlease back a pause on frontier AI. It is the most urgent issue of our time.\n\nYours sincerely,\nJane Smith",
    approximate: false,
    messages: [
      {
        id: 1,
        at: "2026-10-13T09:00:00Z",
        fromName: "Testy McTestface MP",
        fromAddress: "testy.mctestface.mp@parliament.uk",
        fromUs: false,
        fromSupporter: false,
        subject: "Re: Please back a pause on frontier AI",
        text: "Dear Jane,\n\nThank you for writing to me.\n\nTesty",
      },
      {
        id: 2,
        at: "2026-10-13T10:00:00Z",
        fromName: "Jane Smith",
        fromAddress: "jane@example.com",
        fromUs: false,
        fromSupporter: true,
        subject: "Re: Please back a pause on frontier AI",
        text: "Dear Mr McTestface,\n\nThank you. Could we meet?\n\nJane",
      },
    ],
  },
};

const LETTER_ADDRESS = "jane.smith.482913@letters.pauseai.uk";
const MP_ADDRESS = "testy.mctestface.mp@parliament.uk";

/**
 * A supporter's letter with replies: sent with the sender on Cc; an
 * automatic reply to the bounce address; the MP's reply, forwarded to the
 * shared inbox and the sender; and the sender's follow-up, to the shared
 * inbox only. Each reply records who it was to and what was done with it.
 */
export const exampleRepliedLetterDetails: SupporterLetterDetails = {
  ...exampleSupporterLetterDetails,
  status: "sent",
  repliedAt: "2026-10-13T09:00:00Z",
  autoRepliedAt: "2026-10-12T09:06:00Z",
  events: [
    {
      at: "2026-10-14T09:00:00Z",
      status: "replied",
      details: {
        from: "jane@example.com",
        name: "Jane Smith",
        to: `${MP_ADDRESS}, ${LETTER_ADDRESS}`,
        messageId: "<follow-up@example.com>",
        handling: [
          { outcome: "forwarded", to: "policy@pauseai.uk", reason: "policy_inbox", at: "2026-10-14T09:00:01Z" },
          { outcome: "not_forwarded", to: "jane@example.com", reason: "own_follow_up" },
        ],
      },
    },
    {
      at: "2026-10-13T09:00:00Z",
      status: "replied",
      details: {
        from: MP_ADDRESS,
        name: "Testy McTestface MP",
        to: LETTER_ADDRESS,
        cc: "caseworker@parliament.uk",
        replyTo: MP_ADDRESS,
        messageId: "<reply@parliament.uk>",
        handling: [
          { outcome: "forwarded", to: "policy@pauseai.uk", reason: "policy_inbox", at: "2026-10-13T09:00:01Z" },
          { outcome: "forwarded", to: "jane@example.com", reason: "sender", at: "2026-10-13T09:00:02Z" },
        ],
      },
    },
    {
      at: "2026-10-12T09:06:00Z",
      status: "auto_reply",
      details: {
        from: MP_ADDRESS,
        bounceId: 42,
        handling: [{ outcome: "not_forwarded", reason: "bounce_address" }],
      },
    },
    {
      at: "2026-10-12T09:05:00Z",
      status: "sent",
      details: {
        from: LETTER_ADDRESS,
        to: MP_ADDRESS,
        cc: "jane@example.com",
        messageId: "0a1b2c3d-1111-2222-3333-444455556666",
      },
    },
    { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
  ],
};

/**
 * The same letter as recorded before replies' handling was: what's known
 * of it is the forwards logged, one of them refused, as the address was
 * blocked.
 */
export const exampleOlderRepliedLetterDetails: SupporterLetterDetails = {
  ...exampleRepliedLetterDetails,
  events: exampleRepliedLetterDetails.events.map(({ details: { handling, ...details }, ...event }) => {
    void handling;
    return { ...event, details };
  }),
  forwards: [
    { at: "2026-10-13T09:00:01Z", address: "policy@pauseai.uk", outcome: "sent" },
    { at: "2026-10-13T09:00:02Z", address: "jane@example.com", outcome: "refused" },
    { at: "2026-10-14T09:00:01Z", address: "policy@pauseai.uk", outcome: "sent" },
  ],
};

/** One of PauseAI's letters, copied from Airtable, for its page: found in Gmail by its MP's address and when it went, in a mailbox we don't know. */
export const examplePauseaiLetterDetails: PauseaiLetterDetails = {
  kind: "pauseai",
  id: 21,
  status: "sent",
  createdAt: "2026-10-01T12:00:00Z",
  sentAt: "2026-10-01T12:00:00Z",
  mpName: "Polly Placeholder",
  politicianId: 1,
  mpEmail: "polly.placeholder.mp@parliament.uk",
  mailingId: 3,
  mailingAsk: null,
  mailing: "Edinburgh Conference Nov 26 Invitation",
  personalised: true,
  backend: "airtable",
  gmail: {
    mailbox: null,
    search: "to:polly.placeholder.mp@parliament.uk after:1759319700 before:1759320300",
  },
  events: [],
};

/** The letters page's filters and sort, all blank. */
export const emptyLettersSearch: LettersSearch = {
  status: "",
  q: "",
  answered: "",
  campaign: [],
  flag: [],
  backend: [],
  consent: "",
  sort: "",
  dir: "",
  page: "",
};

/** The campaigns the letters page's Campaign filter offers: one of this site's and one of pauseai.info's. */
export const exampleLetterCampaigns = [
  { slug: pm.slug, title: pm.title },
  { slug: "pauseai-info-frontier-ai", title: "Frontier AI letter, from pauseai.info" },
];
