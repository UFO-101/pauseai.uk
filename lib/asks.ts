// Asks: what we ask notable people to do whose answer we record, such as
// signing a letter or coming to an event. Each is a row of the asks table,
// added by a migration; a person's answer to one is a status
// (ask_statuses), and each kind of ask allows its own statuses, as the
// table ask_kind_statuses does.

export const ASK_STATUSES = {
  letter: ["signed"],
  event: ["going", "tentative", "meeting_staff", "tentative_staff", "declined", "declined_surgery", "passed_on"],
} as const;

export type AskKind = keyof typeof ASK_STATUSES;
export type AskStatus = (typeof ASK_STATUSES)[AskKind][number];

/** Each ask's status for one person, keyed by the ask's slug. */
export type AskStatuses = Partial<Record<string, AskStatus>>;

/** Our open letter to the Prime Minister on frontier AI. */
export const FRONTIER_AI_LETTER_ASK = "frontier-ai-letter";
/** Our 2025 letter to Sir Demis Hassabis. */
export const DEEPMIND_LETTER_ASK = "deepmind-letter";
/** ControlAI's statement backing the Artificial Superintelligence Bill. */
export const CONTROLAI_STATEMENT_ASK = "controlai-statement";
/** The conference in Edinburgh, November 2026. */
export const EDINBURGH_CONFERENCE_ASK = "edinburgh-conference-2026";
/** Go to Parliament, 20 October 2026. */
export const GO_TO_PARLIAMENT_ASK = "go-to-parliament-oct-2026";
