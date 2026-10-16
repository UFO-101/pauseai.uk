// The open letter to Sir Demis Hassabis, August 2025: who signed it, and the
// quotes and organisations its page shows.
//
// data/dear_sir_demis_2025_signatories.json is pauseai.info's
// static/open-letter/signatories-square.json, unchanged, as it was when the
// page moved here (last updated 16 September 2025). Its portrait paths are the
// old site's (/portraits/signatories/<house>/<name>.jpg); the processed
// portraits are in public/images/dear-sir-demis-2025/portraits/, under the
// same <house>/<name>.jpg.

import signatoriesData from "@/data/dear_sir_demis_2025_signatories.json";

export type DemisLetterSignatory = {
  name: string;
  displayName?: string;
  /** "MP", "Lord", "Baroness", "MSP", "MLA", "MS", "Bishop" or "Organization". */
  type: string;
  portrait?: string | null;
  status?: string;
};

export type DemisLetterQuote = {
  name: string;
  displayName?: string;
  quote: string;
  portrait: string;
};

export type DemisLetterOrganisation = {
  name: string;
  website: string | null;
  /** A dark logo, for the light page; null shows the name instead. */
  logo: { src: string; width: number; height: number } | null;
};

export const DEMIS_LETTER_SIGNATORIES: DemisLetterSignatory[] = signatoriesData;

const PORTRAITS_DIR = "/images/dear-sir-demis-2025/portraits/";
const OLD_PORTRAITS_DIR = "/portraits/signatories/";

/** Where a signatory's portrait is served from, or null without one. */
export function demisLetterPortraitPath({ portrait }: Pick<DemisLetterSignatory, "portrait">): string | null {
  if (!portrait?.includes(OLD_PORTRAITS_DIR)) return null;
  return portrait.replace(OLD_PORTRAITS_DIR, PORTRAITS_DIR);
}

/** The label under a signatory's name: Lords and Baronesses are both "Peer". */
export function demisLetterDisplayType(type: string): string {
  return type === "Lord" || type === "Baroness" ? "Peer" : type;
}

/** The name as shown, which for the Bishop of Oxford is his own. */
export function demisLetterDisplayName({ name, displayName }: { name: string; displayName?: string }): string {
  return displayName ?? name;
}

// The surname the list is sorted by, as in the PDF of the letter.
function lastName(name: string): string {
  const parts = name
    .replace(/^(Lord|Baroness|Right Revd Dr|Sir|Dame)\s+/, "")
    .replace(/\s+(MC|TD|MP|MSP|MS|MLA)$/, "")
    .split(" ");
  return parts[parts.length - 1].toLowerCase();
}

/**
 * The parliamentarians whose portraits were found (every one, as it
 * happens), by surname.
 */
export function demisLetterParliamentarians(signatories = DEMIS_LETTER_SIGNATORIES): DemisLetterSignatory[] {
  return signatories
    .filter((s) => s.status === "success" && s.type !== "Organization")
    .sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
}

// In the order shown. PauseAI Global, which organised the letter, isn't.
const ORGANISATIONS: DemisLetterOrganisation[] = [
  {
    name: "Open Rights Group",
    website: "https://www.openrightsgroup.org/",
    logo: { src: "/images/dear-sir-demis-2025/logos/open-rights-group.png", width: 600, height: 224 },
  },
  {
    name: "Connected by Data",
    website: "https://connectedbydata.org/",
    logo: { src: "/images/dear-sir-demis-2025/logos/connected-by-data.png", width: 1390, height: 364 },
  },
  {
    name: "Safe AI for Children Alliance",
    website: "https://www.safeaiforchildren.org/",
    logo: { src: "/images/dear-sir-demis-2025/logos/safe-ai-for-children-alliance.png", width: 1535, height: 1327 },
  },
  {
    name: "Open Data Manchester",
    website: "https://www.opendatamanchester.org.uk/",
    logo: { src: "/images/dear-sir-demis-2025/logos/open-data-manchester.png", width: 667, height: 173 },
  },
];

/**
 * The organisations that signed, but PauseAI Global, in the order above. One
 * not listed there goes last, by name alone.
 */
export function demisLetterOrganisations(signatories = DEMIS_LETTER_SIGNATORIES): DemisLetterOrganisation[] {
  const order = ORGANISATIONS.map((o) => o.name);
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
  return signatories
    .filter((s) => s.type === "Organization" && s.name !== "PauseAI Global")
    .sort((a, b) => rank(a.name) - rank(b.name))
    .map((s) => ORGANISATIONS.find((o) => o.name === s.name) ?? { name: s.name, website: null, logo: null });
}

export const DEMIS_LETTER_QUOTES: DemisLetterQuote[] = [
  {
    name: "Lord Browne of Ladyton",
    portrait: "/images/dear-sir-demis-2025/portraits/lords/browne.jpg",
    quote:
      "If leading companies like Google treat these commitments as optional, we risk a dangerous race to deploy increasingly powerful AI without proper safeguards.",
  },
  {
    name: "Baroness Kidron",
    portrait: "/images/dear-sir-demis-2025/portraits/lords/kidron.jpg",
    quote:
      "Voluntary safety promises only work if they're transparent. It is important to understand the timeline, know the identity of those who have tested it, and have faith in the process.",
  },
  {
    name: "The Lord Bishop of Oxford",
    displayName: "Right Revd Dr Steven Croft",
    portrait: "/images/dear-sir-demis-2025/portraits/lords/oxford.jpg",
    quote:
      "Ethics cannot be an afterthought in AI development. Google's failure to honor their safety commitments betrays the trust necessary for responsible innovation.",
  },
  {
    name: "Baroness Chakrabarti",
    portrait: "/images/dear-sir-demis-2025/portraits/lords/chakrabarti.jpg",
    quote:
      "AI safety commitments without transparency are meaningless. The public has a right to know how these powerful systems are tested.",
  },
  {
    name: "Ben Lake MP",
    portrait: "/images/dear-sir-demis-2025/portraits/commons/ben_lake.jpg",
    quote:
      "AI safety isn't just for Silicon Valley to decide. Google must be transparent about who tests their systems.",
  },
  {
    name: "Sir Desmond Swayne TD MP",
    portrait: "/images/dear-sir-demis-2025/portraits/commons/desmond_swayne.jpg",
    quote:
      "Big Tech shouldn't be above the commitments they make. Google must come clean about their AI safety testing.",
  },
];
