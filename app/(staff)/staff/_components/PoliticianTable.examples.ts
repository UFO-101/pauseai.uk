import { campaigns } from "@/lib/content/email-your-mp";
import type { Politician, PoliticianChange } from "@/lib/server/politicians";

const [pm] = campaigns;

/** A sitting MP who has signed the letter to the PM. */
export const examplePolitician: Politician = {
  id: 7,
  airtableId: "rec90002",
  house: "commons",
  name: "Polly Placeholder",
  salutation: "Ms Placeholder",
  constituency: "Cities of London and Westminster",
  party: "Labour (Co-op)",
  email: "polly.placeholder.mp@parliament.uk",
  isTest: false,
  sitting: true,
  emailBlocked: false,
  letters: 4,
  replies: 1,
  statuses: {
    [pm.slug]: {
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
    details: { politicianId: 7, campaign: pm.slug, status: "signed", date: "2026-10-01", note: "Told us at the march" },
  },
  {
    id: 9,
    at: "2026-09-30T10:00:00Z",
    actor: "sam@pauseai.uk",
    action: "edit politician",
    details: { id: 7, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" },
  },
];
