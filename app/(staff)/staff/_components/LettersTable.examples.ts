import { campaigns } from "@/lib/content/email-your-mp";
import type { LetterSummary, PauseaiLetterDetails, SupporterLetterDetails } from "@/lib/server/letters";

const [pm] = campaigns;

/** A letter to the test MP that bounced. */
export const exampleLetter: LetterSummary = {
  id: 1,
  campaign: pm.slug,
  status: "bounced",
  senderName: "Jane Smith",
  senderEmail: "jane@example.com",
  contactConsent: true,
  mpName: "Testy McTestface MP",
  politicianId: 3,
  isTest: true,
  imported: false,
  createdAt: "2026-10-12T09:00:00Z",
  sentAt: "2026-10-12T09:05:00Z",
  repliedAt: null,
  supporterId: 7,
  events: [
    { at: "2026-10-12T09:10:00Z", status: "bounced", details: { type: "HardBounce" } },
    { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
  ],
};

/** A supporter's letter, for its page: its subject, and Postmark's ID for the email, as the policy@ group has it. */
export const exampleSupporterLetterDetails: SupporterLetterDetails = {
  ...exampleLetter,
  kind: "supporter",
  subject: "Please back a pause on frontier AI",
  postmarkId: "0a1b2c3d-1111-2222-3333-444455556666",
};

/** One of PauseAI's letters, copied from Airtable, for its page. */
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
  mailing: "Edinburgh Conference Nov 26 Invitation",
  personalised: true,
  events: [],
};
