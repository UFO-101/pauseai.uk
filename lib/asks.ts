// Asks: what we ask notable people to do whose answer we record, such as
// signing a letter or coming to an event. Each is a row of the asks table,
// added by staff on /staff/asks or by a migration; a person's answer to one
// is a status (ask_statuses), and each kind of ask allows its own statuses,
// as the table ask_kind_statuses does, so a new status needs a migration.

export const ASK_STATUSES = {
  letter: ["signed"],
  event: ["going", "tentative", "meeting_staff", "tentative_staff", "declined", "declined_surgery", "passed_on"],
} as const;

export type AskKind = keyof typeof ASK_STATUSES;
export type AskStatus = (typeof ASK_STATUSES)[AskKind][number];

/** Who asks it: supporters, in their letters or in person, PauseAI, in its own emails, or ControlAI. */
export type Asker = "supporters" | "pauseai" | "controlai";

/** Each ask's status for one person, keyed by the ask's slug. */
export type AskStatuses = Partial<Record<string, AskStatus>>;

/** PauseAI's frontier AI letter to the Prime Minister. */
export const FRONTIER_AI_LETTER_ASK = "frontier-ai-letter";
/** PauseAI's 2025 letter to Sir Demis Hassabis of Google DeepMind. */
export const DEEPMIND_LETTER_ASK = "deepmind-letter";
/** ControlAI's campaign statement, which parliamentarians have signed since February 2025. */
export const CONTROLAI_STATEMENT_ASK = "controlai-statement";
/** ControlAI's letter to the Prime Minister backing the Artificial Superintelligence Bill. */
export const CONTROLAI_LETTER_ASK = "controlai-letter";
/** The conference in Edinburgh, November 2026. */
export const EDINBURGH_CONFERENCE_ASK = "edinburgh-conference-2026";
/** Go to Parliament, 20 October 2026. */
export const GO_TO_PARLIAMENT_ASK = "go-to-parliament-oct-2026";

/** The asks the code names, which staff can't edit or delete: imports and campaigns depend on them. */
export const FIXED_ASKS: readonly string[] = [
  FRONTIER_AI_LETTER_ASK,
  DEEPMIND_LETTER_ASK,
  CONTROLAI_STATEMENT_ASK,
  CONTROLAI_LETTER_ASK,
  EDINBURGH_CONFERENCE_ASK,
  GO_TO_PARLIAMENT_ASK,
];

export const ASKERS: readonly Asker[] = ["supporters", "pauseai", "controlai"];

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A new ask's slug, from its title and, if it has one, its date's month
 * and year: "Go to Parliament" on 2026-10-20 is go-to-parliament-oct-2026.
 * Letters and digits only, so the table's check takes it.
 */
export function askSlug(title: string, date: string | null): string {
  const words = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const when = date ? `${MONTHS[Number(date.slice(5, 7)) - 1]}-${date.slice(0, 4)}` : "";
  return [words || "ask", when].filter(Boolean).join("-");
}
