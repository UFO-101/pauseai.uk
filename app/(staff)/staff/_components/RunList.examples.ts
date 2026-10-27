import {
  type AnyImportRun,
  type ControlAiImportResult,
  type EmailSyncResult,
  type GoToParliamentImportResult,
  type ImportJob,
  type LumaImportResult,
  type MembersImportResult,
  type MpCheckResult,
  NIGHTLY,
  type PoliticianSync,
  type PoliticianSyncResult,
  type WebFormImportResult,
} from "@/lib/import-runs";
import type { SyncedPolitician } from "@/lib/politician-sync";

type Results = {
  "sync-politicians": PoliticianSyncResult;
  "sync-emails": EmailSyncResult;
  "check-mps": MpCheckResult;
  "import-controlai": ControlAiImportResult;
  "import-luma": LumaImportResult;
  "import-members": MembersImportResult;
  "import-web-form-letters": WebFormImportResult;
  "import-go-to-parliament": GoToParliamentImportResult;
};
type RunOf<Job extends ImportJob> = Extract<AnyImportRun, { job: Job }>;

/** A run from the import log that went well, with `result`. */
export function exampleRun<Job extends ImportJob>(
  job: Job,
  result: Results[Job],
  run: Partial<RunOf<Job>> = {},
): RunOf<Job> {
  return {
    id: 1,
    at: "2026-10-15T02:00:00Z",
    job,
    startedBy: NIGHTLY,
    decidedBy: null,
    status: "ok",
    error: null,
    result,
    ...run,
  } as RunOf<Job>;
}

/** A run from the import log that failed, with `error`. */
export const exampleFailedRun = <Job extends ImportJob>(
  job: Job,
  error: string,
  run: Partial<RunOf<Job>>,
): RunOf<Job> => ({ ...exampleRun(job, {} as Results[Job]), status: "failed", error, ...run }) as RunOf<Job>;

/** An MP as a sync copies them from Airtable: "MP 1", of "Seat 1". */
export const exampleSyncedMp = (id: number, email: string | null = "a@parliament.uk"): SyncedPolitician => ({
  airtableId: `rec${id}`,
  name: `MP ${id}`,
  salutation: "",
  email,
  status: "in_office",
  house: "commons",
  constituency: `Seat ${id}`,
  party: "",
  country: null,
  notes: "",
  importantTarget: false,
  personalConnection: false,
});

/** A peer as a sync copies them: no constituency. */
const examplePeer: SyncedPolitician = {
  ...exampleSyncedMp(5),
  name: "Lord Example",
  house: "lords",
  constituency: null,
};

/**
 * A sync held for staff to apply or discard: one MP added, one gone from
 * Airtable, a peer added, and one renamed, with the statuses it set.
 */
export const exampleHeldSync: PoliticianSync = exampleRun(
  "sync-politicians",
  {
    changes: {
      added: [exampleSyncedMp(1), examplePeer],
      removed: [exampleSyncedMp(2, null)],
      changed: [{ ...exampleSyncedMp(6), name: "Someone New" }],
    },
    renamed: [{ airtableId: "rec6", from: "MP 6", to: "Someone New" }],
    statuses: { added: 3, changed: 1, removed: 0 },
    records: [{ politician: exampleSyncedMp(1), statuses: {} }],
  },
  { id: 3, at: "2026-10-12T02:00:00Z", status: "held" },
);

/** An MP sync someone applied, kept from before the sync read every body: one MP changed. */
export const exampleAppliedSync: PoliticianSync = exampleRun(
  "sync-politicians",
  {
    changes: {
      added: [],
      removed: [],
      changed: [{ airtableId: "rec4", name: "MP 4", constituency: "Seat 4", email: "a@parliament.uk" }],
    },
  } as unknown as PoliticianSyncResult,
  { id: 2, at: "2026-10-11T02:00:00Z", status: "applied", decidedBy: "jo@pauseai.uk" },
);

/** What a run of the Emails sync did: one email held back for a mailing nobody has added, one with two boxes. */
export const exampleEmailsResult: EmailSyncResult = {
  read: 270,
  added: 12,
  waiting: 1,
  noPolitician: 1,
  unplaced: [
    { airtableId: "recEmail1", mailings: [] },
    { airtableId: "recEmail2", mailings: ["CSRB Iqbal Amendment", "Ben Lake October 2026 Debate"] },
  ],
};

/** What the one-off import of the web form letters did. */
export const exampleWebFormResult: WebFormImportResult = {
  read: 731,
  imported: 716,
  skipped: 13,
  alreadyHere: 2,
  noPolitician: 0,
  supportersAdded: 600,
  linked: 716,
};

/** What the one-off import of Go to Parliament's meetings did. */
export const exampleGoToParliamentResult: GoToParliamentImportResult = {
  guests: 8,
  mps: 6,
  added: 6,
  changed: 0,
  notFound: 0,
};

/** What a run of the Luma import did: every event read, nothing left over. */
export const exampleLumaResult: LumaImportResult = {
  events: 2,
  eventsSynced: 9,
  eventsLeft: 0,
  guestsChanged: 14,
  people: 3,
  contacts: 1,
  supportersAdded: 2,
  linked: 3,
  requests: 21,
};

/** What a run of the members import did: a few new members, one of whom left Keep me informed unticked. */
export const exampleMembersResult: MembersImportResult = {
  members: 1505,
  added: 3,
  changed: 1,
  removed: 0,
  supportersAdded: 2,
  linked: 3,
};

/** What a read of ControlAI's letter found, with every name placed. */
export const exampleControlAiResult: ControlAiImportResult = {
  pdfUrl: "https://images.controlai.com/letter.pdf",
  signatories: 86,
  matched: 74,
  added: 2,
  removed: 1,
  problems: [],
};
