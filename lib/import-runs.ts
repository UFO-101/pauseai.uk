// The import log's types, shared by the server (lib/server/import-runs.ts)
// and the staff components that show a run (app/(staff)/staff/_components/Run.tsx).
import type { ControlAiMatchProblem } from "./controlai-letter";
import type { MpProblem } from "./mp-check";
import type { PoliticianChanges, PoliticianRecord, Renamed } from "./politician-sync";

export const IMPORT_JOBS = [
  "import-old-letters",
  "import-luma",
  "import-members",
  "read-gmail",
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
  "import-old-letters": "old-letters",
  "check-mps": "mp-check",
  "import-controlai": "controlai",
  "import-members": "members",
  "read-gmail": "gmail",
};

/** How often each job runs on its own, matching its schedule in netlify/functions/; a one-off is only run by staff. */
export const JOB_SCHEDULES: Record<ImportJob, "frequent" | "hourly" | "nightly" | "oneOff"> = {
  "import-luma": "frequent",
  "import-members": "hourly",
  "read-gmail": "frequent",
  "sync-politicians": "nightly",
  "sync-emails": "oneOff",
  "import-web-form-letters": "oneOff",
  "import-go-to-parliament": "oneOff",
  "import-old-letters": "frequent",
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

/** Where supporters are, looked up after a Luma import: the postcodes and towns looked up, and whether postcodes.io failed partway. */
export type PlacesLookup = { postcodes: number; towns: number; failed: boolean };

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
  /** Hosts added to or taken off events (runs kept before hosts were copied don't say). */
  hostsChanged?: number;
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
  /** The postcodes and towns looked up at the end of the run (runs kept before this was recorded don't say). */
  places?: PlacesLookup;
  /** Why the run stopped before it was done: its time was up, Luma's rate limit was near, or another run had the lock. */
  stoppedBy?: "time" | "rate-limit" | "running";
  /** Whether it worked out every supporter's facts and the supporters list again: after a change, or at least hourly. */
  refreshed?: boolean;
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

/** What reading one connected Gmail account found. */
export type GmailRead = {
  account: string;
  replies: number;
  autoReplies: number;
  bounces: number;
  /** One-off emails kept, as threads with politicians, in an account that keeps them. */
  oneOffs?: number;
  /** The mailbox's history had gone, so it was searched instead. */
  restarted?: boolean;
  /** Why it couldn't be read. Read again next time, from where it got to, unless it was disconnected. */
  error?: string;
  /** Google refused its access, so it was disconnected, and isn't read again until it's connected again. */
  disconnected?: boolean;
  /** The letters inbox's: messages relayed, spam that matched no letter, and letters matched only by being the latest. */
  relayed?: number;
  spam?: number;
  uncertain?: number;
  /** The letters inbox's messages it couldn't account for, which a person has to look at. */
  notUnderstood?: NotUnderstood[];
};

/**
 * Why a message in the letters inbox wasn't understood: to a proxy we
 * don't have, or none of ours; from neither of a letter's two parties;
 * failing authentication; over its letter's cap on relays; or a bounce of
 * nothing we sent.
 */
export type NotUnderstoodReason = "unknown_proxy" | "no_proxy" | "stranger" | "not_verified" | "over_cap" | "bounce";

/** A message the letters inbox couldn't account for: its Gmail ID, for a link, who it's from, its subject and why. */
export type NotUnderstood = { gmailMessageId: string; from: string; subject: string; reason: NotUnderstoodReason };

/** What a run of reading Gmail found, account by account. */
export type GmailReadResult = { accounts: GmailRead[] };
export type GmailReading = ImportRun<"read-gmail", GmailReadResult>;

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

/** How far the import of old letters has got, over all its runs. */
export type OldLettersProgress = {
  read: number;
  left: number;
  joined: number;
  replies: number;
  autoReplies: number;
  oneOffs: number;
  /** Runs Gmail stopped, of those the log still has. */
  refusals: number;
  /** What's joined or added, by mailing or form letter's campaign, and what they're called. */
  byMailing: Record<string, number>;
  titles: Record<string, string>;
};

/** What a run of the import of old letters did: how far it got, and what it found. */
export type OldLettersImportResult = {
  /** It read everything listed, and did the last steps. */
  finished: boolean;
  /** Why it stopped short: Gmail refused a request. */
  stoppedBy?: "gmail";
  /** What Gmail said. */
  stoppedWhy?: string;
  /** How many of its searches it has listed: its place, between its calls. */
  searchesDone?: number;
  /** Messages listed and read this run, and how many are left. */
  listed: number;
  read: number;
  left: number;
  requests: number;
  /** Form letters' and Postmark letters' texts copied. */
  formTexts: number;
  postmarkTexts: number;
  /** Letters joined to their sent emails, added from them, and not joined, by mailing, or for a form letter its campaign. */
  joined: Record<string, number>;
  added: Record<string, number>;
  notJoined: Record<string, number>;
  /** What those are called, by the key each is counted under. */
  titles?: Record<string, string>;
  replies: number;
  autoReplies: number;
  oneOffs: number;
  /** Gmail IDs of messages Gmail wouldn't give. */
  unreadable: string[];
  /** Mail in policy@ and the group's archive that matched nothing, which only staff with supporters see. */
  unmatched: { from: string; subject: string }[];
  /** Mailings given a template, and letters that keep their own text as they don't fit theirs. */
  templates: number;
  ownText: number;
  /** Letters with a person's reply newly marked. */
  repliedSet: number;
};
export type OldLettersImport = ImportRun<"import-old-letters", OldLettersImportResult>;

export type AnyImportRun =
  | PoliticianSync
  | EmailSync
  | MpCheck
  | ControlAiImport
  | LumaImport
  | MembersImport
  | GmailReading
  | WebFormImport
  | GoToParliamentImport
  | OldLettersImport;

/** Whether a Luma run left work for later: it was cut short, or postcodes.io failed. */
function lumaRunIncomplete(result: LumaImportResult): boolean {
  return result.stoppedBy !== undefined || result.places?.failed === true;
}

/**
 * How a run ended, as its line in the import log says it: its status, or
 * for a Luma import that left work for later or an Emails sync that held
 * some back, "incomplete", in place of "ok" or "unchanged". A Gmail read
 * that couldn't read an account, or had to disconnect one, or found mail
 * in the letters inbox a person has to look at, failed: someone has to.
 */
export function runStatus(run: AnyImportRun): string {
  if (run.job === "import-luma" && run.status !== "failed" && lumaRunIncomplete(run.result)) return "incomplete";
  // Emails held back for a mailing nobody has added yet.
  if (run.job === "sync-emails" && run.status !== "failed" && run.result.unplaced.length > 0) return "incomplete";
  // Left to read: a later run carries on.
  if (run.job === "import-old-letters" && run.status !== "failed" && !run.result.finished) return "incomplete";
  if (run.job === "read-gmail" && run.status !== "failed") {
    // An account that couldn't be read, a disconnected one among them, or mail in the letters inbox a person
    // has to look at.
    if (run.result.accounts.some((a) => a.error || a.notUnderstood?.length)) return "failed";
  }
  return run.status;
}

/** How a run ended, as a colour: green when it went well, changing something or nothing, amber held or stopped short, red failed; none when it was discarded, or never ran. */
export function runTone(run: AnyImportRun | undefined): "green" | "amber" | "red" | undefined {
  if (!run) return undefined;
  const status = runStatus(run);
  if (status === "failed") return "red";
  if (status === "held" || status === "incomplete") return "amber";
  return run.status === "discarded" ? undefined : "green";
}
