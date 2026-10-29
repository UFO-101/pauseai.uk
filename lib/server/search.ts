import "server-only";

// A search typed into a staff list. Every word typed must be somewhere in
// the row, ignoring case and accents: "Tris Osborne" finds Tristan Osborne,
// and "Sian" finds Siân. When nothing does, a list can rank rows by how near
// a field is to what was typed (closeness()), which forgives a typo. unaccent and pg_trgm
// are Postgres extensions (migration 0038).

/** The words typed, each a LIKE pattern matching it anywhere, its % and _ taken literally. */
function searchPatterns(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`);
}

/** Whether `column` holds `pattern`, a parameter, ignoring case and accents. */
export function contains(column: string, pattern: string): string {
  return `unaccent(${column}) ILIKE unaccent(${pattern})`;
}

/**
 * SQL that's true when every word of `text`, which has at least one, is in
 * one of a row's fields. `anyField` is the condition for one word's
 * pattern, a parameter `add` makes.
 */
export function everyWord(
  text: string,
  add: (value: unknown) => string,
  anyField: (pattern: string) => string,
): string {
  return searchPatterns(text)
    .map((pattern) => `(${anyField(add(pattern))})`)
    .join(" AND ");
}

/** How close `column` is to `text`, a parameter, from 0 to 1: the best match of the typed text within it. */
export function closeness(column: string, text: string): string {
  return `word_similarity(unaccent(${text}), unaccent(coalesce(${column}, '')))`;
}

/** The closeness below which a row isn't offered as near what was typed. */
export const CLOSE_ENOUGH = 0.4;

/**
 * What a search typed as a phone number, or part of one, is in the form
 * phone_number() stores numbers in, as far as it can tell from the start:
 * "07700 900" is "+447700900". Undefined for a search that isn't one: not
 * four or more digits, with only spaces, brackets, dots or dashes between.
 */
export function phoneSearch(text: string): string | undefined {
  const digits = text.replace(/[\s().-]/g, "");
  if (!/^\+?\d{4,}$/.test(digits)) return undefined;
  if (digits.startsWith("+440")) return `+44${digits.slice(4)}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return digits;
}
