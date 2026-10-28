import { fieldsIn, isBlankMailing, type MailingDoc } from "./mailing-doc";
import { now } from "./now";

// What stops a mailing being scheduled, for the server to refuse and the
// page to say, from the same rules.

export type ScheduleProblem =
  | "no-subject"
  | "no-letter"
  | "unknown-filter"
  | "no-recipients"
  | "field-lacking"
  | "no-sender"
  | "no-time"
  | "time-passed"
  | "cannot-send";

/** A mailing as far as scheduling it goes, with who it goes to and whether its channel sends. */
export type SchedulingMailing = {
  subject: string;
  body: MailingDoc;
  sentFrom: string | null;
  dueAt: string | null;
  /** How many it goes to. */
  recipients: number;
  /** The merge fields some of them have no value for. */
  lacking: string[];
  /** The values of its filter the site no longer knows. */
  unknown: string[];
  /** Whether its channel sends mailings yet. */
  sends: boolean;
};

/** What stops a mailing being scheduled: none, for one that can be. A field it uses must have a value for everyone. */
export function scheduleProblems(mailing: SchedulingMailing): ScheduleProblem[] {
  const checks: [ScheduleProblem, boolean][] = [
    ["no-subject", !mailing.subject.trim()],
    ["no-letter", isBlankMailing(mailing.body)],
    ["unknown-filter", mailing.unknown.length > 0],
    ["no-recipients", mailing.recipients === 0],
    ["field-lacking", fieldsIn(mailing.body).some((field) => mailing.lacking.includes(field))],
    ["no-sender", !mailing.sentFrom],
    ["no-time", !mailing.dueAt],
    ["time-passed", Boolean(mailing.dueAt) && new Date(mailing.dueAt!) <= now()],
    ["cannot-send", !mailing.sends],
  ];
  return checks.filter(([, fails]) => fails).map(([problem]) => problem);
}
