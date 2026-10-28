import type { Ask, AskWithCounts } from "@/lib/server/asks";
import type { Politician, PoliticianChange, PoliticiansPage, PoliticiansSearch } from "@/lib/server/politicians";

/** The asks, as the migrations add them, newest first: two events and two letters, one with no date or link, linked to our pages and others'. */
export const exampleAsks: Ask[] = [
  {
    slug: "edinburgh-conference-2026",
    title: "Example Conference",
    kind: "event",
    date: "2026-11-01",
    url: "https://luma.com/example",
    askedBy: ["pauseai"],
  },
  {
    slug: "go-to-parliament-oct-2026",
    title: "Example Day at Parliament",
    kind: "event",
    date: "2026-10-20",
    url: null,
    askedBy: [],
  },
  {
    slug: "controlai-letter",
    title: "Example Letter Backing the Bill",
    kind: "letter",
    date: "2026-09-11",
    url: "https://example.org/letter",
    askedBy: ["controlai"],
  },
  {
    slug: "frontier-ai-letter",
    title: "Example Letter to the PM",
    kind: "letter",
    date: null,
    url: "/pdfs/Frontier-AI-Open-Letter.pdf",
    askedBy: ["supporters", "pauseai"],
  },
];

/** The asks with how many gave each answer: a letter signed, an event answered every way it allows, and one nobody has answered. */
export const exampleAsksWithCounts: AskWithCounts[] = [
  { ...exampleAsks[0], counts: { declined: 50, passed_on: 1, going: 3 } },
  {
    ...exampleAsks[1],
    counts: { going: 2, tentative: 1, meeting_staff: 1, declined_surgery: 1 },
  },
  { ...exampleAsks[2], counts: {} },
  { ...exampleAsks[3], counts: { signed: 10 } },
];

/** An MP in office who has signed the letter to the PM, and declined the conference, from Airtable. */
export const examplePolitician: Politician = {
  id: 7,
  airtableId: "rec90002",
  airtableRemovedAt: null,
  house: "commons",
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  party: "Labour (Co-op)",
  country: "england",
  email: "polly.placeholder.mp@parliament.uk",
  status: "in_office",
  notes: "Met at the example fair.\nRecommended",
  importantTarget: true,
  personalConnection: false,
  isTest: false,
  emailBlocked: false,
  firstActivityAt: null,
  lastActivityAt: null,
  letters: 4,
  replies: 1,
  statuses: {
    "edinburgh-conference-2026": {
      status: "declined",
      date: null,
      note: "",
      updatedAt: "2026-10-03T10:00:00Z",
      updatedBy: "airtable",
    },
    "frontier-ai-letter": {
      status: "signed",
      date: "2026-10-01",
      note: "",
      updatedAt: "2026-10-02T10:00:00Z",
      updatedBy: "jo@pauseai.uk",
    },
  },
};

/** The politicians page's list of Polly alone, with nothing else for a search to say. */
export const examplePoliticiansPage: PoliticiansPage = {
  politicians: [examplePolitician],
  total: 1,
  page: 1,
  pages: 1,
  pageSize: 100,
  outOfOffice: 0,
  tests: 0,
  otherHouses: 0,
  closest: [],
};

/** The politicians page's filters, all blank. */
export const emptyPoliticiansSearch: PoliticiansSearch = {
  q: "",
  house: "",
  status: "",
  party: [],
  flag: [],
  country: [],
  email: [],
  ask: "",
  answer: "",
  sort: "",
  dir: "",
  page: "",
};

/** What the audit log says about Polly: her status set, her address blocked by Postmark and unblocked by staff. */
export const examplePoliticianHistory: PoliticianChange[] = [
  {
    id: 12,
    at: "2026-10-14T09:30:00Z",
    actor: "jo@pauseai.uk",
    action: "unblock address",
    details: { address: "polly.placeholder.mp@parliament.uk", note: "Fixed in Airtable" },
  },
  {
    id: 11,
    at: "2026-10-12T09:10:00Z",
    actor: "postmark",
    action: "block address",
    details: { address: "polly.placeholder.mp@parliament.uk", kind: "hard" },
  },
  {
    id: 10,
    at: "2026-10-02T10:00:00Z",
    actor: "jo@pauseai.uk",
    action: "set status",
    details: {
      politicianId: 7,
      ask: "frontier-ai-letter",
      status: "signed",
      date: "2026-10-01",
      note: "Told us at the march",
    },
  },
  {
    id: 9,
    at: "2026-09-30T10:00:00Z",
    actor: "sam@pauseai.uk",
    action: "edit politician",
    details: { id: 7, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" },
  },
];
