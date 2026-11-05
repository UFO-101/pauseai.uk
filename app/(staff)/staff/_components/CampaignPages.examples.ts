import { staffCopy } from "@/lib/content/staff-interface";
import type { AskPageData } from "@/lib/server/asks";
import type { CampaignSummary, CampaignVersion } from "@/lib/server/campaigns";
import type { OneOffThread, OneOffThreadRow } from "@/lib/server/one-off-emails";
import type { SentEmail } from "@/lib/server/sent-emails";
import type { OldLettersImportResult } from "@/lib/import-runs";
import { exampleAsks } from "./PoliticianTable.examples";

// Fake data for the pages of campaigns, asks, sent emails and one-off emails,
// for their tests and the gallery.

/** A campaign with an ask, a letter failed, and its letters over several months. */
export const exampleCampaign: CampaignSummary = {
  slug: "pauseai-info-frontier-ai",
  title: "Regulate AI developers now (Airtable)",
  ask: "frontier-ai-letter",
  askTitle: "Frontier AI letter to the Prime Minister",
  askKind: "letter",
  url: null,
  letters: 12,
  sent: 11,
  failed: 1,
  replied: 2,
  answered: 3,
  politicians: 9,
  supporters: 10,
  firstAt: "2026-06-18T09:00:00Z",
  lastAt: "2026-10-22T09:00:00Z",
};

/** A campaign with no ask, whose letters are from last year. */
export const exampleCampaignNoAsk: CampaignSummary = {
  ...exampleCampaign,
  slug: "pauseai-info-liability",
  title: "Legislate for liability for AI model severe harm",
  ask: null,
  askTitle: null,
  askKind: null,
  answered: 0,
  failed: 0,
  firstAt: "2025-05-20T09:00:00Z",
  lastAt: "2025-06-17T09:00:00Z",
};

/** A campaign nobody has written to anyone for. */
export const exampleCampaignEmpty: CampaignSummary = {
  ...exampleCampaignNoAsk,
  slug: "support-sobel-bill",
  title: "Support the bill",
  letters: 0,
  sent: 0,
  replied: 0,
  politicians: 0,
  supporters: 0,
  firstAt: null,
  lastAt: null,
};

export const exampleVersions: CampaignVersion[] = [
  {
    key: "newer",
    from: "2026-09-23T02:00:00Z",
    letters: 4,
    subject: "Request to co-sign letter on frontier AI risks",
    text: "Dear {salutation}\n\nI'm a resident of {constituency} and a supporter of **PauseAI**.\n\n{name}\n\n{postcode}",
  },
  {
    key: "older",
    from: "2026-06-18T02:00:00Z",
    letters: 8,
    subject: "Please sign the letter",
    text: "Dear {salutation}\n\nPlease sign the letter.\n\n{name}",
  },
];

export const exampleChanged = 6;

/** An ask a campaign and a mailing put, signed and declined. */
export const exampleAskPage: AskPageData = {
  ...exampleAsks[3],
  counts: { signed: 2, declined: 1 },
  writtenTo: 40,
  campaigns: 1,
  mailings: 1,
  fixed: false,
  noAnswer: 37,
  answersTotal: 3,
  page: 1,
  pages: 1,
  pageSize: 100,
  ways: [
    {
      kind: "campaign",
      href: "/staff/campaigns/pauseai-info-deepmind",
      title: "Call DeepMind to honour AI Safety Summit pledges",
      from: "2025-07-23T09:00:00Z",
      to: "2025-09-30T09:00:00Z",
      letters: 19,
    },
    {
      kind: "mailing",
      href: "/staff/mailings/3",
      title: "DeepMind: ten of your colleagues",
      from: "2025-06-20T09:00:00Z",
      to: "2025-06-20T10:00:00Z",
      letters: 21,
    },
  ],
  answers: [
    {
      politicianId: 1,
      name: "Polly Placeholder",
      constituency: "Seat One",
      party: "Example Party",
      status: "signed",
      lastWrittenTo: "2026-10-01T09:00:00Z",
    },
    { politicianId: 2, name: "Dee Dummy", constituency: null, party: null, status: "declined", lastWrittenTo: null },
  ],
};

/** A thread only with PauseAI, and one with someone else in it. */
export const exampleOneOffs: OneOffThreadRow[] = [
  {
    id: 1,
    subject: "Meeting about the bill",
    someoneElse: false,
    latestAt: "2026-10-20T09:00:00Z",
    messages: 2,
    people: [{ id: 1, name: "Polly Placeholder" }],
    participants: ["Joseph Example", "Polly Placeholder"],
    mailboxes: ["joseph@pauseai.uk", "policy@pauseai.uk"],
    answered: true,
  },
  {
    id: 2,
    subject: "Fwd: my MP's answer",
    someoneElse: true,
    latestAt: "2026-10-19T09:00:00Z",
    messages: 1,
    people: [],
    participants: ["Jane Smith"],
    mailboxes: ["policy@pauseai.uk"],
    answered: false,
  },
];

/** A thread as staff without `supporters` see one with someone else in it. */
export const exampleHiddenOneOff: OneOffThreadRow = {
  ...exampleOneOffs[1],
  subject: null,
  participants: null,
  mailboxes: null,
  answered: null,
};

export const exampleOneOffThread: OneOffThread = {
  ...exampleOneOffs[0],
  messages_: [
    {
      id: 1,
      at: "2026-10-19T09:00:00Z",
      fromName: "Joseph Example",
      fromAddress: "joseph@pauseai.uk",
      to: '"Placeholder, Polly" <polly.placeholder.mp@parliament.uk>, Jane Smith <jane.smith@example.com>',
      cc: "",
      subject: "Meeting about the bill",
      account: "joseph@pauseai.uk",
      politicians: { "polly.placeholder.mp@parliament.uk": 1 },
      text: "Dear Polly,\n\nCould we meet?",
    },
    {
      id: 2,
      at: "2026-10-20T09:00:00Z",
      fromName: "",
      fromAddress: "polly.placeholder.mp@parliament.uk",
      to: "joseph@pauseai.uk",
      cc: "someone@example.com",
      subject: "Re: Meeting about the bill",
      account: "joseph@pauseai.uk",
      politicians: { "polly.placeholder.mp@parliament.uk": 1 },
      text: null,
    },
  ],
};

const SENT_ROW: SentEmail = {
  id: 1,
  at: "2026-11-04T10:50:00Z",
  purpose: "letter",
  imported: false,
  address: "polly.placeholder.mp@parliament.uk",
  outcome: "sent",
  problem: null,
  backend: "gmail",
  fromAddress: "write.to+jane.smith@pauseai.uk",
  subject: "Request to support the bill",
  letterId: 7,
  letterHref: "/staff/letters/7",
  campaignHref: "/staff/campaigns/support-sobel-bill",
  mailingHref: null,
  to: { name: "Polly Placeholder", href: "/staff/politicians/1" },
  from: { name: "Jane Smith", href: "/staff/supporters/5" },
};

/** Each kind of row: a letter; one bounced, with a supporter's name but no link; an imported mailing's; a sign-in. */
export const exampleSentEmails: SentEmail[] = [
  SENT_ROW,
  {
    ...SENT_ROW,
    id: 2,
    outcome: "bounced",
    problem: "hard",
    backend: "postmark",
    from: { name: "Sam Brown", href: null },
  },
  {
    ...SENT_ROW,
    id: 3,
    at: "2025-06-20T09:00:00Z",
    purpose: "mailing",
    imported: true,
    fromAddress: "joseph@pauseai.info",
    letterHref: "/staff/mailings/3/letters/9",
    campaignHref: null,
    mailingHref: "/staff/mailings/3",
    from: null,
  },
  {
    ...SENT_ROW,
    id: 4,
    purpose: "staff-login",
    address: "jo@pauseai.uk",
    fromAddress: "noreply@notify.pauseai.uk",
    backend: "postmark",
    subject: "Confirm sign in",
    letterId: null,
    letterHref: null,
    campaignHref: null,
    mailingHref: null,
    to: null,
    from: null,
  },
];

/** A press of the import that has more to read, with mail that matched nothing, and one Gmail stopped. */
export const exampleOldLettersResult: OldLettersImportResult = {
  finished: false,
  listed: 900,
  read: 800,
  left: 100,
  requests: 1200,
  formTexts: 7,
  postmarkTexts: 2,
  joined: { "deepmind-30-june": 500, form: 40 },
  added: { "russell-speak": 3 },
  notJoined: { "deepmind-august": 90, "pauseai-info-liability": 2 },
  titles: staffCopy.oldLetters.mailingTitles,
  replies: 40,
  autoReplies: 200,
  oneOffs: 12,
  unreadable: ["18f0a"],
  unmatched: [{ from: "Jane Smith <jane@example.com>", subject: "A question" }],
  templates: 3,
  ownText: 5,
  repliedSet: 11,
};
