// Pure helpers for the Email your MP tool: picking a campaign and writing
// the letter. Used by the form in the browser and by the server, which
// checks what it's sent against the same campaigns.
import { FIXED_ASKS } from "@/lib/asks";
import { campaigns, type Campaign, type LetterDetails, type MpStatuses } from "@/lib/content/email-your-mp";
import { docFromMarkup, type Inline, type LetterDoc } from "@/lib/letter-format";

/** An MP as the form sees them. */
export type Mp = {
  name: string;
  /** "Ms Dummy", or built from the name when Parliament has none. */
  salutation: string;
  constituency: string;
  /** null when Parliament lists no email for them. */
  email: string | null;
  /** Their address bounced, so letters can't reach them: the lookup then gives no email. */
  unreachable?: boolean;
};

export type { MpStatuses };

/** Where the campaigns' pages are. */
const CAMPAIGNS_PATH = "/campaigns";

export function campaignPath(campaign: Campaign): string {
  return `${CAMPAIGNS_PATH}/${campaign.slug}`;
}

/** "sw1a 1aa " → "SW1A1AA", for comparing postcodes. */
export function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/** "sw1a1aa" → "SW1A 1AA", the way postcodes are written: the inward part is the last three characters. */
export function displayPostcode(postcode: string): string {
  const bare = normalisePostcode(postcode);
  return bare.length > 3 ? `${bare.slice(0, -3)} ${bare.slice(-3)}` : bare;
}

export function campaignBySlug(slug: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.slug === slug);
}

/** The first campaign, in priority order, that makes this ask. */
export function campaignForAsk(ask: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.ask === ask);
}

/** The campaigns an MP can have done: those with `done`. */
export const trackedCampaigns = campaigns.filter((campaign) => campaign.done !== undefined);

/** The asks staff record a status for by hand: those of the campaigns an MP can have done. */
export const trackedAsks: string[] = trackedCampaigns.map((campaign) => campaign.ask!);

/** Whether staff record answers to an ask by hand: a campaign's that staff record, or one staff added, which no import fills. */
export function answeredByHand(ask: string): boolean {
  return trackedAsks.includes(ask) || !FIXED_ASKS.includes(ask);
}

/** Whether the MP has met the campaign's ask. Nobody has done a campaign without `done`. */
export function isDone(campaign: Campaign, statuses: MpStatuses): boolean {
  return campaign.done !== undefined && statuses[campaign.ask] === campaign.done;
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
 * The letter the form starts with: the campaign's, which ends with the
 * sender's name, then a paragraph of their address, a line each. All of it
 * is theirs to edit, a town added, say, and it's sent as they leave it.
 */
export function draftLetter(campaign: Campaign, details: LetterDetails, address: string[]): LetterDoc {
  const body = docFromMarkup(campaign.letter(details));
  const lines = address.flatMap((line, i): Inline[] => [
    ...(i > 0 ? [{ type: "hardBreak" } as const] : []),
    { type: "text", text: line },
  ]);
  return { type: "doc", content: [...body.content, { type: "paragraph", content: lines }] };
}

/**
 * The address the letter starts with, under the sender's name: their first
 * line, then the postcode their MP was found from, unless they typed it.
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
