// Pure helpers for the Email your MP tool: picking a campaign and writing
// the letter. Used by the form in the browser and by the server, which
// checks what it's sent against the same campaigns.
import { campaigns, type Campaign, type CampaignStatus, type LetterDetails } from "@/lib/content/email-your-mp";
import { docFromMarkup, type Inline, type LetterDoc } from "@/lib/letter-format";

/** An MP as the form sees them. */
export type Mp = {
  name: string;
  /** "Ms Abbott", or built from the name when Parliament has none. */
  salutation: string;
  constituency: string;
  /** null when Parliament lists no email for them. */
  email: string | null;
};

/** Each campaign's status for one MP, keyed by campaign slug. */
export type MpStatuses = Partial<Record<string, CampaignStatus>>;

/** Where the campaigns' pages are. Stage 5 of the plan moves them to /campaigns. */
export const CAMPAIGNS_PATH = "/campaigns-v2";

export function campaignPath(campaign: Campaign): string {
  return `${CAMPAIGNS_PATH}/${campaign.slug}`;
}

/** "sw1a 1aa " → "SW1A1AA", for comparing postcodes. */
export function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}


export function campaignBySlug(slug: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.slug === slug);
}

export function isDone(campaign: Campaign, statuses: MpStatuses): boolean {
  return statuses[campaign.slug] === campaign.done;
}

/**
 * The first campaign, in priority order, that this MP hasn't done. If
 * they've done them all, the first, which then thanks them.
 */
export function chooseCampaign(statuses: MpStatuses): Campaign {
  return campaigns.find((campaign) => !isDone(campaign, statuses)) ?? campaigns[0];
}

/**
 * Where a campaign's page sends someone whose MP has already done it: the
 * first campaign they haven't. None if they've done them all, so the page
 * stays and thanks them.
 */
export function campaignToMoveTo(campaign: Campaign, statuses: MpStatuses): Campaign | undefined {
  if (!isDone(campaign, statuses)) return undefined;
  const next = chooseCampaign(statuses);
  return isDone(next, statuses) ? undefined : next;
}

/** The letter the form starts with: a request, or thanks if it's done. */
export function draftLetter(campaign: Campaign, statuses: MpStatuses, details: LetterDetails): LetterDoc {
  return docFromMarkup(isDone(campaign, statuses) ? campaign.thanks(details) : campaign.letter(details));
}

/** The letter as sent: the body the sender edited, then their name and address, a line each. */
export function fullLetter(body: LetterDoc, senderName: string, address: string[]): LetterDoc {
  const signature = [senderName, ...address].flatMap((line, i): Inline[] => [...(i > 0 ? [{ type: "hardBreak" } as const] : []), { type: "text", text: line }]);
  return { type: "doc", content: [...body.content, { type: "paragraph", content: signature }] };
}

/**
 * The lines under the sender's name: their address, then the postcode their
 * MP was found from, unless they've already typed it.
 */
export function signatureAddress(address: string, postcode: string): string[] {
  const lines = addressLines(address);
  const typed = lines.some((line) => normalisePostcode(line).endsWith(normalisePostcode(postcode)));
  return typed ? lines : [...lines, postcode.trim().toUpperCase()];
}

/** A typed address, as signature lines: trimmed, without blank lines. */
export function addressLines(address: string): string[] {
  return address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** A loose check that catches some typos. */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
