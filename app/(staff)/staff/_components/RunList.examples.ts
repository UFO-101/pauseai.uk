import {
  type AnyImportRun,
  type ControlAiImportResult,
  type ImportJob,
  type LumaImportResult,
  type MembersImportResult,
  type MpCheckResult,
  type MpSync,
  type MpSyncResult,
  NIGHTLY,
  type SignatoryImportResult,
} from "@/lib/import-runs";
import type { SyncedMp } from "@/lib/mps";

type Results = {
  "sync-mps": MpSyncResult;
  "check-mps": MpCheckResult;
  "import-controlai": ControlAiImportResult;
  "import-signatories": SignatoryImportResult;
  "import-luma": LumaImportResult;
  "import-members": MembersImportResult;
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
export const exampleSyncedMp = (id: number, email: string | null = "a@parliament.uk"): SyncedMp => ({
  airtableId: `rec${id}`,
  name: `MP ${id}`,
  salutation: "",
  constituency: `Seat ${id}`,
  party: "",
  email,
});

/** An MP sync held for staff to apply or discard: one MP added, one removed. */
export const exampleHeldSync: MpSync = exampleRun(
  "sync-mps",
  {
    changes: { added: [exampleSyncedMp(1)], removed: [exampleSyncedMp(2, null)], changed: [] },
    mps: [exampleSyncedMp(1)],
  },
  { id: 3, at: "2026-10-12T02:00:00Z", status: "held" },
);

/** An MP sync someone applied: one MP changed. */
export const exampleAppliedSync: MpSync = exampleRun(
  "sync-mps",
  { changes: { added: [], removed: [], changed: [exampleSyncedMp(4)] } },
  { id: 2, at: "2026-10-11T02:00:00Z", status: "applied", decidedBy: "jo@pauseai.uk" },
);

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
  optedOut: 1,
  resubscribed: 0,
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
