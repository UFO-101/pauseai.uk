import type { Ask } from "@/lib/server/asks";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";

/** The asks, as the migrations add them, a letter and an event of each kind. */
export const exampleAsks: Ask[] = [
  { slug: "go-to-parliament-oct-2026", title: "Example Day at Parliament", kind: "event", date: "2026-10-20" },
  { slug: "edinburgh-conference-2026", title: "Example Conference", kind: "event", date: null },
  { slug: "frontier-ai-letter", title: "Example Letter to the PM", kind: "letter", date: null },
  { slug: "controlai-statement", title: "Example Statement", kind: "letter", date: null },
];

/** An MP in office who has signed the letter to the PM, and declined the conference, from Airtable. */
export const examplePolitician: Politician = {
  id: 7,
  airtableId: "rec90002",
  airtableRemovedAt: null,
  house: "commons",
  name: "Polly Placeholder",
  forename: "Polly",
  surname: "Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  party: "Labour (Co-op)",
  country: "england",
  city: "London",
  email: "polly.placeholder.mp@parliament.uk",
  status: "in_office",
  notes: "Met at the example fair.\nRecommended",
  importantTarget: true,
  personalConnection: false,
  isTest: false,
  emailBlocked: false,
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
