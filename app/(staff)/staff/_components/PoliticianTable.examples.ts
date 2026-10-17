import { campaigns } from "@/lib/content/email-your-mp";
import type { Politician } from "@/lib/server/politicians";

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
