import { isOfficialName } from "./constituencies";
import { onParliamentDomain } from "./one-off";
import type { ParliamentMp } from "./parliament";

// Where Airtable's MPs disagree with Parliament's Members API, or with the
// official constituency names, for the policy team to look at
// (/staff/import-data). Nothing is changed by it.

/** An MP in office, as copied from Airtable. */
export type AirtableMp = { name: string; constituency: string; email: string | null };

export type MpProblem =
  /** Parliament has an MP for a constituency Airtable hasn't. */
  | { kind: "missing"; constituency: string; parliament: string }
  /**
   * Airtable's constituency isn't spelt as the official list has it
   * (lib/constituencies.ts), so no postcode will find its MP.
   */
  | { kind: "unofficial"; constituency: string; airtable: string }
  /** Airtable has an MP for a constituency Parliament hasn't: they may have left. */
  | { kind: "extra"; constituency: string; airtable: string }
  /** Different names, not counting titles such as Dr or Sir. */
  | { kind: "name"; constituency: string; airtable: string; parliament: string }
  /** Airtable's email isn't one Parliament lists, or Airtable has none. */
  | { kind: "email"; constituency: string; name: string; airtable: string | null; parliament: string[] };

const TITLES = /^(?:(?:the\s+)?rt\.?\s+hon\.?|mr|mrs|ms|miss|mx|dr|sir|dame|prof(?:essor)?|lord|lady)\.?\s+/i;

/** A name without titles, spacing or case: "Dr Ellie Chowns" and "Ellie Chowns" match. */
export function plainName(name: string): string {
  let plain = name.trim().replace(/\s+MP$/i, "");
  while (TITLES.test(plain)) plain = plain.replace(TITLES, "");
  return plain.replace(/\s+/g, " ").toLowerCase();
}

/**
 * The problems, by constituency. An MP Parliament lists no email for isn't
 * one: Airtable fills those gaps.
 */
export function checkAgainstParliament(airtable: AirtableMp[], parliament: ParliamentMp[]): MpProblem[] {
  const ours = new Map(airtable.map((mp) => [mp.constituency, mp]));
  const theirs = new Map(parliament.map((mp) => [mp.constituency, mp]));
  const problems: MpProblem[] = [];
  for (const constituency of [...new Set([...ours.keys(), ...theirs.keys()])].sort((a, b) => a.localeCompare(b))) {
    const a = ours.get(constituency);
    const p = theirs.get(constituency);
    if (a && !isOfficialName(constituency)) problems.push({ kind: "unofficial", constituency, airtable: a.name });
    if (!a) {
      problems.push({ kind: "missing", constituency, parliament: p!.name });
      continue;
    }
    if (!p) {
      problems.push({ kind: "extra", constituency, airtable: a.name });
      continue;
    }
    if (plainName(a.name) !== plainName(p.name))
      problems.push({ kind: "name", constituency, airtable: a.name, parliament: p.name });
    const listed = p.emails.map((email) => email.toLowerCase());
    if (!a.email || (listed.length > 0 && !listed.includes(a.email.toLowerCase()))) {
      problems.push({ kind: "email", constituency, name: a.name, airtable: a.email, parliament: p.emails });
    }
  }
  return problems;
}

/** Domains that say nothing of whose a thread is: social media, parties, and mail anyone can have. */
const SHARED_DOMAIN =
  /(^|\.)(facebook|twitter|x|instagram|linkedin|youtube|tiktok|threads|bsky|gmail|googlemail|hotmail|outlook|yahoo|icloud|aol|btinternet|labour|conservatives|libdems|greenparty|snp|plaid|reform|reformparty|dup|sinnfein|alliance|sdlp|uup|linktr|wordpress|wixsite)\.(com|org|org\.uk|uk|co\.uk|net|scot|cymru|ee|app|social)$/;

/** A web or email address's domain, without a leading www, lowercased; undefined if it has none. */
export function domainOf(address: string): string | undefined {
  const text = address.trim().toLowerCase();
  const domain = text.includes("@")
    ? text.slice(text.lastIndexOf("@") + 1)
    : text.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0];
  return domain.includes(".") ? domain.replace(/^www\./, "") : undefined;
}

/**
 * Each domain of a politician's own, by their ID, from their listed email
 * and web addresses: not a parliament's, a party's or social media, and held
 * by only one of them.
 */
export function ownDomains(people: { id: number; addresses: string[] }[]): Map<string, number> {
  const holders = new Map<string, Set<number>>();
  for (const { id, addresses } of people) {
    for (const address of addresses) {
      const domain = domainOf(address);
      if (!domain || SHARED_DOMAIN.test(domain) || onParliamentDomain(`x@${domain}`)) continue;
      holders.set(domain, (holders.get(domain) ?? new Set()).add(id));
    }
  }
  return new Map([...holders].filter(([, ids]) => ids.size === 1).map(([domain, ids]) => [domain, [...ids][0]]));
}
