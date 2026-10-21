import { campaigns } from "@/lib/content/email-your-mp";
import type { LetterSummary } from "@/lib/server/letters";

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
  isTest: true,
  subject: "S",
  createdAt: "2026-10-12T09:00:00Z",
  sentAt: "2026-10-12T09:05:00Z",
  repliedAt: null,
  supporterId: 7,
  events: [
    { at: "2026-10-12T09:00:00Z", status: "sending", details: {} },
    { at: "2026-10-12T09:10:00Z", status: "bounced", details: { type: "HardBounce" } },
  ],
};
