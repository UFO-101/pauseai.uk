// What a mailing's letter can be filled in with (lib/mailing-doc.ts): the
// merge fields each audience's recipients have, and the conditions a part
// only some get can be for.

/** The merge fields of a mailing to politicians. */
export const POLITICIAN_FIELDS = ["salutation", "name", "constituency", "party", "house"] as const;

/** A condition that someone gave an answer to an ask: "<ask>:<status>". */
export function answerCondition(ask: string, status: string): string {
  return `${ask}:${status}`;
}

/**
 * A merge field or a condition, as the editor offers it: those not every
 * recipient has a value for are ghosted, saying how many lack one; a
 * condition says how many it covers.
 */
export type MailingChoice = { id: string; label: string; lacking?: number; covers?: number };
