// ControlAI's letter to the Prime Minister backing the Artificial
// Superintelligence Security Bill. Its page
// links the letter as a PDF, whose text ends with the signatories. An MP on
// it already supports the bill: lib/server/controlai-import.ts copies them
// in nightly, and nobody edits that status by hand. The caller fetches and
// extracts the text; this is the parsing and the matching.

import { CONTROLAI_LETTER_ASK } from "./asks";

export const CONTROLAI_LETTER_PAGE = "https://controlai.org/uk-pm-letter";

/** The campaign for the bill, whose ask is the letter. */
export const SOBEL_BILL_CAMPAIGN = "support-sobel-bill";

/**
 * Whether the MP signed the letter, from their statuses. That doesn't count
 * as having done the bill's campaign, which asks them to the debate: it
 * changes what its page and letter say.
 */
export function signedControlAiLetter(statuses: Partial<Record<string, string>>): boolean {
  return statuses[CONTROLAI_LETTER_ASK] === "signed";
}

/** `updated_by` on the statuses the letter sets, which nothing else writes. */
export const CONTROLAI = "controlai";

/** The letter's PDF, linked from the page (a Framer site, with no names in its HTML). */
export function pdfUrlIn(html: string): string | undefined {
  return html.match(/https:\/\/[a-z0-9.-]*controlai\.com\/[^"'\s<>]+\.pdf/i)?.[0];
}

export type ControlAiSignatory = {
  /** As written in the letter: "Rt Hon. the Lord Goldsmith of Richmond Park". */
  name: string;
  /** Signed after the letter was delivered, in the list that follows it. */
  addedLater: boolean;
};

// The signatures start after the sign-off, and the PDF generator's footer
// follows them. Between them, a sentence introduces those who signed later.
const SIGN_OFF = /^Yours sincerely,?$/im;
const FOOTER = /^Powered by TCPDF/im;
const LATER = /^Since this letter was originally delivered/i;
const LATER_END = /have also signed:?$/i;

/** The signatories in the letter's text, a line each, in order. */
export function signatoriesIn(text: string): ControlAiSignatory[] {
  const start = text.search(SIGN_OFF);
  if (start < 0) return [];
  const footer = text.search(FOOTER);
  const lines = text
    .slice(start, footer < 0 ? undefined : footer)
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);
  const signatories: ControlAiSignatory[] = [];
  let addedLater = false;
  let inSentence = false;
  for (const line of lines) {
    if (LATER.test(line)) {
      addedLater = true;
      inSentence = true;
    }
    if (inSentence) {
      if (LATER_END.test(line)) inSentence = false;
      continue;
    }
    signatories.push({ name: line, addedLater });
  }
  return signatories;
}

// Honours after a name ("Lord Rees of Ludlow OM"), and titles before it.
const HONOURS = /\b(OM|OBE|CBE|MBE|DBE|KBE|KG|GCB|CVO|CMG|KCMG|FRCP|FRCPCH|QC|KC)\b/g;
const TITLES = /\b(The|Rt\.? ?Hon\.?|Rt\.? ?Rev\.?|the|Sir|Dame|Dr|Mr|Mrs|Ms|Professor|Prof)\b\.?/g;

/** "The Rt Hon Sir John Hayes MP" → "john hayes"; "Lord (Mike) Watson of Invergowrie" → "lord watson of invergowrie". */
export function normaliseName(name: string): string {
  return name
    .replace(/[’‘]/g, "'")
    .replace(/,/g, " ")
    .replace(/\(.*?\)/g, "")
    .replace(HONOURS, "")
    .replace(TITLES, "")
    .replace(/\bMP$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * The keys a name is known by, most specific first. A peer is written in
 * full in the letter ("Lord Goldsmith of Richmond Park") and short in
 * Airtable ("Lord Goldsmith"), so both forms are keys. Bishops are only
 * ever "Lord Bishop of X".
 */
export function nameKeys(name: string): string[] {
  const full = normaliseName(name);
  const keys = [full];
  const peer = full.match(/^(lord bishop|lord|baroness|lady) (.+)$/);
  if (peer) {
    const [, title, rest] = peer;
    const words = rest.split(" ");
    const of = words.indexOf("of");
    const surname = (of < 0 ? words : words.slice(0, of)).at(-1);
    if (title !== "lord bishop" && surname) {
      // "Lord Brian Mackenzie of Framwellgate" → "lord mackenzie", and the
      // surname with the place, for "Lord Watson of Invergowrie".
      const titles = title === "lord" ? ["lord"] : ["baroness", "lady"];
      for (const t of titles) {
        keys.push(`${t} ${surname}`);
        if (of >= 0) keys.push(`${t} ${surname} ${words.slice(of).join(" ")}`);
      }
    }
  } else {
    // "Neil Duncan Jordan" in the letter, "Neil Duncan-Jordan" in Airtable.
    keys.push(full.replace(/-/g, " "));
  }
  return [...new Set(keys)];
}

/** Whether `a` and `b` differ by at most one letter changed, added or removed. */
export function oneLetterOut(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}

/** A politician the letter's names are matched against. */
export type Candidate = { id: number; house: string; name: string };

export type ControlAiMatchProblem = {
  name: string;
  /** Nobody in our table, or more than one (which only a person can settle). */
  kind: "nobody" | "several";
  /** The names of those it could be, when several. */
  candidates: string[];
};

export type Matches = {
  /** Each matched politician's ID, with the signatory. */
  matched: Map<number, ControlAiSignatory>;
  problems: ControlAiMatchProblem[];
};

/**
 * Which of our politicians signed. An MP in the letter is "Name MP", a
 * peer "Lord X", so an "MP" name is only matched to the Commons and a
 * peer's to the Lords. The letter has typos ("Hinchcliff" for Chris
 * Hinchliff), so an MP's name may be one letter out, if that leaves one.
 */
export function matchSignatories(signatories: ControlAiSignatory[], candidates: Candidate[]): Matches {
  const index = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    for (const key of nameKeys(candidate.name)) index.set(key, [...(index.get(key) ?? []), candidate]);
  }
  const matched = new Map<number, ControlAiSignatory>();
  const problems: ControlAiMatchProblem[] = [];
  for (const signatory of signatories) {
    const isMp = /\bMP$/.test(signatory.name.trim());
    const house = isMp ? "commons" : "lords";
    let found: Candidate[] = [];
    for (const key of nameKeys(signatory.name)) {
      found = (index.get(key) ?? []).filter((c) => c.house === house);
      if (found.length > 0) break;
    }
    if (found.length === 0 && isMp) {
      const want = normaliseName(signatory.name);
      found = candidates.filter((c) => c.house === house && oneLetterOut(normaliseName(c.name), want));
    }
    if (found.length === 1) matched.set(found[0].id, signatory);
    else
      problems.push({
        name: signatory.name,
        kind: found.length === 0 ? "nobody" : "several",
        candidates: found.map((c) => c.name),
      });
  }
  return { matched, problems };
}
