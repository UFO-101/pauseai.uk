// Pure helpers for the Email your MP tool: picking a campaign and writing
// the letter. Used by the form in the browser and by the server, which
// checks what it's sent against the same campaigns.
import { campaigns, type Campaign, type CampaignStatus, type LetterDetails } from "@/lib/content/email-your-mp";
import { BILL_CAMPAIGN } from "@/lib/controlai-letter";
import { docFromMarkup, type Inline, type LetterDoc } from "@/lib/letter-format";

/** An MP as the form sees them. */
export type Mp = {
  name: string;
  /** "Ms Dummy", or built from the name when Parliament has none. */
  salutation: string;
  constituency: string;
  /** null when Parliament lists no email for them. */
  email: string | null;
};

/** Each campaign's status for one MP, keyed by campaign slug. */
export type MpStatuses = Partial<Record<string, CampaignStatus>>;

/** Where the campaigns' pages are. Stage 5 of the plan moves them to /campaigns. */
const CAMPAIGNS_PATH = "/campaigns-v2";

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

/**
 * The campaigns staff record a status for: those an MP can have done. A
 * campaign without `done` isn't in the staff interface.
 */
export const trackedCampaigns = campaigns.filter((campaign) => campaign.done !== undefined);

/** Whether the MP has done it. Nobody has done a campaign without `done`. */
export function isDone(campaign: Campaign, statuses: MpStatuses): boolean {
  return campaign.done !== undefined && statuses[campaign.slug] === campaign.done;
}

/**
 * The first campaign, in priority order, that this MP hasn't done. There's
 * always one: the last campaign is one nobody has done.
 */
export function chooseCampaign(statuses: MpStatuses): Campaign {
  return campaigns.find((campaign) => !isDone(campaign, statuses))!;
}

/**
 * Where a campaign's page sends someone whose MP has already done it: the
 * first campaign they haven't. None if they haven't done this one.
 */
export function campaignToMoveTo(campaign: Campaign, statuses: MpStatuses): Campaign | undefined {
  return isDone(campaign, statuses) ? chooseCampaign(statuses) : undefined;
}

/**
 * Whether the MP signed ControlAI's letter to the PM backing the Sobel bill
 * (lib/controlai-letter.ts). That doesn't count as having done the bill's
 * campaign, which asks them to the debate: it changes what the letter says.
 */
export function signedControlAiLetter(statuses: MpStatuses): boolean {
  return statuses[BILL_CAMPAIGN] === "signed";
}

/** The letter the form starts with. */
export function draftLetter(campaign: Campaign, details: LetterDetails): LetterDoc {
  return docFromMarkup(campaign.letter(details));
}

/** The letter as sent: the body the sender edited, then their name and address, a line each. */
export function fullLetter(body: LetterDoc, senderName: string, address: string[]): LetterDoc {
  const signature = [senderName, ...address].flatMap((line, i): Inline[] => [
    ...(i > 0 ? [{ type: "hardBreak" } as const] : []),
    { type: "text", text: line },
  ]);
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
