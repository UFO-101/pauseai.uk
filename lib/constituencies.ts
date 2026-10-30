import constituencies from "./constituencies.json";

// The 650 Westminster constituencies from 4 July 2024, by their official
// code, with their official names: the ONS's "Westminster Parliamentary
// Constituencies (July 2024) Names and Codes in the UK (V2)",
// https://www.data.gov.uk/dataset/90293fcf-9268-4a1a-be3d-d4a20d314604,
// fetched 14 Oct 2026. Airtable spells the constituencies this way.
//
// postcodes.io gives each postcode's constituency code as well as its name,
// and its names don't always match: it spells Montgomeryshire and Glyndŵr
// without the circumflex. So postcodes are matched to MPs by code, through
// this list. Replace it after the next boundary review.
const NAMES: Readonly<Record<string, string>> = constituencies;

/** The official name of the constituency with this code, if it's one. */
export function constituencyName(code: string): string | undefined {
  return Object.hasOwn(NAMES, code) ? NAMES[code] : undefined;
}

/** The official code of the constituency with this official name, if it's one. */
export function constituencyCode(name: string): string | undefined {
  return Object.hasOwn(CODES, name) ? CODES[name] : undefined;
}

/** Whether this is a constituency's official name, exactly. */
export function isOfficialName(name: string): boolean {
  return OFFICIAL.has(name);
}

const OFFICIAL = new Set(Object.values(NAMES));
const CODES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(NAMES).map(([code, name]) => [name, code]),
);
