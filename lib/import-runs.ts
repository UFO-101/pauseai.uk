// The import log's types, shared by the server (lib/server/import-runs.ts)
// and the staff components that show a run (app/(staff)/staff/_components/Run.tsx).
import type { ControlAiMatchProblem } from "./controlai-letter";
import type { MpProblem } from "./mp-check";
import type { PoliticianChanges, PoliticianRecord, Renamed } from "./politician-sync";

export const IMPORT_JOBS = [
  "import-luma",
  "import-members",
  "sync-politicians",
  "sync-emails",
  "check-mps",
  "import-controlai",
  "import-web-form-letters",
  "import-go-to-parliament",
] as const;
export type ImportJob = (typeof IMPORT_JOBS)[number];

export function isImportJob(value: string): value is ImportJob {
  return (IMPORT_JOBS as readonly string[]).includes(value);
}

/** Each job's page, /staff/import-data/<slug>: its button and every run. */
const IMPORT_SLUGS: Record<ImportJob, string> = {
  "import-luma": "luma",
  "sync-politicians": "politicians",
  "sync-emails": "emails",
  "import-web-form-letters": "web-form-letters",
  "import-go-to-parliament": "go-to-parliament",
  "check-mps": "mp-check",
  "import-controlai": "controlai",
  "import-members": "members",
};

/** How often each job runs on its own, matching its schedule in netlify/functions/; a one-off is only run by staff. */
export const JOB_SCHEDULES: Record<ImportJob, "hourly" | "nightly" | "oneOff"> = {
  "import-luma": "hourly",
  "import-members": "hourly",
  "sync-politicians": "nightly",
  "sync-emails": "nightly",
  "import-web-form-letters": "oneOff",
  "import-go-to-parliament": "oneOff",
  "check-mps": "nightly",
  "import-controlai": "nightly",
};

/** Where a job's page is. */
export function importPath(job: ImportJob): string {
  return `/staff/import-data/${IMPORT_SLUGS[job]}`;
}

/** The job a page's slug names, if any. */
export function jobBySlug(slug: string): ImportJob | undefined {
  return IMPORT_JOBS.find((job) => IMPORT_SLUGS[job] === slug);
}

/** A job's newest run as a list for RunList: itself, or none if it has never run. */
export function asList<Run>(run: Run | undefined): Run[] {
  return run ? [run] : [];
}

/** Who starts the scheduled runs (netlify/functions/), whatever their schedule. Staff runs are started by the staff member's email. */
export const NIGHTLY = "nightly";

/** ok or failed; a sync-politicians run is instead unchanged, held, applied or discarded. */
export type ImportRunStatus = "ok" | "failed" | "unchanged" | "held" | "applied" | "discarded";

/** One run of a job: how it ended, and the job's own account of what it found, unless it failed. */
export type ImportRun<Job extends ImportJob, Result> = {
  id: number;
  at: string;
  job: Job;
  /** NIGHTLY, a staff member's email, or null for a run kept before 16 Oct 2026, when this wasn't recorded. */
  startedBy: string | null;
  /** Who applied or discarded a held sync. */
  decidedBy: string | null;
} & (
  | { status: "failed"; error: string; result: Record<string, never> }
  | { status: Exclude<ImportRunStatus, "failed">; error: null; result: Result }
);

/** Statuses an import set, changed or took away. */
export type StatusCounts = { added: number; changed: number; removed: number };

/**
 * What a sync-politicians run keeps: what changed, the names among it, and
 * the statuses it set. A held one also keeps every record, to apply later.
 * Runs from before the sync read every body keep only the changes.
 */
export type PoliticianSyncResult = {
  changes: PoliticianChanges;
  renamed?: Renamed[];
  statuses?: StatusCounts;
  records?: PoliticianRecord[];
};
export type PoliticianSync = ImportRun<"sync-politicians", PoliticianSyncResult>;

export type MpCheckResult = { problems: MpProblem[] };
export type MpCheck = ImportRun<"check-mps", MpCheckResult>;

export type ControlAiImportResult = {
  pdfUrl: string;
  /** Names in the letter. */
  signatories: number;
  /** Of those, in our table. */
  matched: number;
  /** Statuses set and removed this run. */
  added: number;
  removed: number;
  problems: ControlAiMatchProblem[];
};
export type ControlAiImport = ImportRun<"import-controlai", ControlAiImportResult>;

/** What a run of the Luma import did: counts of what it copied, and what stopped it, if anything did. */
export type LumaImportResult = {
  /** Events added, changed or removed. */
  events: number;
  /** Events whose guest list was read in full. */
  eventsSynced: number;
  /** Events still waiting for their guest list, for the next run. */
  eventsLeft: number;
  /** Guest rows added, changed or marked as removed. */
  guestsChanged: number;
  /** People added or changed. */
  people: number;
  /** Contacts whose joining date was set. */
  contacts: number;
  /** Supporters made for people seen for the first time, and source records linked to a supporter. */
  supportersAdded: number;
  linked: number;
  requests: number;
  /** Pages of the calendar's contacts read. */
  contactPages?: number;
  /** A full pass over the contacts is part-way through: later runs read the rest. */
  contactsPassGoing?: boolean;
  /** Why the run stopped before it was done: its time was up, Luma's rate limit was near, or another run had the lock. */
  stoppedBy?: "time" | "rate-limit" | "running";
};
export type LumaImport = ImportRun<"import-luma", LumaImportResult>;

/** What a run of the members import did: counts of what it copied. */
export type MembersImportResult = {
  /** Members read from the membership dataset. */
  members: number;
  /** Members added, changed, or marked as removed. */
  added: number;
  changed: number;
  removed: number;
  /** Supporters made for people seen for the first time, and source records linked to a supporter. */
  supportersAdded: number;
  linked: number;
};
export type MembersImport = ImportRun<"import-members", MembersImportResult>;

/** What a run of the Emails sync did: the emails read, those it added, and those it couldn't. */
export type EmailSyncResult = {
  read: number;
  added: number;
  /** Emails to a politician who isn't here yet, for a later run. */
  waiting: number;
  /** Emails linked to no politician, or several. */
  noPolitician: number;
  /** Emails with no known mailing's box ticked, or several: by record, with the boxes ticked. */
  unplaced: { airtableId: string; mailings: string[] }[];
};
export type EmailSync = ImportRun<"sync-emails", EmailSyncResult>;

/** What the one-off import of pauseai.info's web form letters did: the letters read, and what became of each. */
export type WebFormImportResult = {
  read: number;
  imported: number;
  /** Marked as spam, invalid, or never sent. */
  skipped: number;
  /** Already imported, or already here from the same sender to the same politician for the same ask. */
  alreadyHere: number;
  /** To a politician who isn't here, or to none or several. */
  noPolitician: number;
  supportersAdded: number;
  linked: number;
};
export type WebFormImport = ImportRun<"import-web-form-letters", WebFormImportResult>;

/** What the one-off import of Go to Parliament's meetings did. */
export type GoToParliamentImportResult = {
  /** Guests with a meeting status, and the MPs they were to meet. */
  guests: number;
  mps: number;
  /** Statuses set, and changed. */
  added: number;
  changed: number;
  /** MPs who aren't here. */
  notFound: number;
};
export type GoToParliamentImport = ImportRun<"import-go-to-parliament", GoToParliamentImportResult>;

export type AnyImportRun =
  | PoliticianSync
  | EmailSync
  | MpCheck
  | ControlAiImport
  | LumaImport
  | MembersImport
  | WebFormImport
  | GoToParliamentImport;

/** Whether a Luma run left work for later: it was cut short, or the contacts pass is still going. */
function lumaRunIncomplete(result: LumaImportResult): boolean {
  return result.stoppedBy !== undefined || result.contactsPassGoing === true;
}

/**
 * How a run ended, as its line in the import log says it: its status, or
 * for a Luma import that left work for later, or an Emails sync that held
 * some back, "incomplete", in place of "ok" or "unchanged".
 */
export function runStatus(run: AnyImportRun): string {
  if (run.job === "import-luma" && run.status !== "failed" && lumaRunIncomplete(run.result)) return "incomplete";
  // Emails held back for a mailing nobody has added yet.
  if (run.job === "sync-emails" && run.status !== "failed" && run.result.unplaced.length > 0) return "incomplete";
  return run.status;
}

/** How a run ended, as a colour: green when it went well, amber held or stopped short, red failed; none when it changed nothing, was discarded, or never ran. */
export function runTone(run: AnyImportRun | undefined): "green" | "amber" | "red" | undefined {
  if (!run) return undefined;
  if (run.status === "failed") return "red";
  if (run.status === "held" || runStatus(run) === "incomplete") return "amber";
  return run.status === "ok" || run.status === "applied" ? "green" : undefined;
}
