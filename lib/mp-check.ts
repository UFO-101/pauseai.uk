import type { SyncedMp } from "./mps";
import type { ParliamentMp } from "./parliament";

// Where Airtable's MPs disagree with Parliament's Members API, for the
// policy team to look at (/staff/mp-check). Nothing is changed by it.

export type MpProblem =
  /** Parliament has an MP for a constituency Airtable hasn't. */
  | { kind: "missing"; constituency: string; parliament: string }
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
export function checkAgainstParliament(airtable: SyncedMp[], parliament: ParliamentMp[]): MpProblem[] {
  const ours = new Map(airtable.map((mp) => [mp.constituency, mp]));
  const theirs = new Map(parliament.map((mp) => [mp.constituency, mp]));
  const problems: MpProblem[] = [];
  for (const constituency of [...new Set([...ours.keys(), ...theirs.keys()])].sort((a, b) => a.localeCompare(b))) {
    const a = ours.get(constituency);
    const p = theirs.get(constituency);
    if (!a) {
      problems.push({ kind: "missing", constituency, parliament: p!.name });
      continue;
    }
    if (!p) {
      problems.push({ kind: "extra", constituency, airtable: a.name });
      continue;
    }
    if (plainName(a.name) !== plainName(p.name)) problems.push({ kind: "name", constituency, airtable: a.name, parliament: p.name });
    const listed = p.emails.map((email) => email.toLowerCase());
    if (!a.email || (listed.length > 0 && !listed.includes(a.email.toLowerCase()))) {
      problems.push({ kind: "email", constituency, name: a.name, airtable: a.email, parliament: p.emails });
    }
  }
  return problems;
}
