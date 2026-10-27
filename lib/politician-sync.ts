// Politicians as the sync copies them from Airtable's UK Parliamentarians
// (lib/server/outside-services/airtable.ts), and what a sync would change.
import type { AskStatus } from "./asks";

/** A politician as we store them, by their Airtable record. */
export type SyncedPolitician = {
  /** Airtable's record ID. */
  airtableId: string;
  name: string;
  salutation: string;
  email: string | null;
  status: "in_office" | "died" | "retired" | "left_office";
  house: "commons" | "lords" | "scottish-parliament" | "senedd" | "ni-assembly" | "other";
  constituency: string | null;
  party: string;
  country: "england" | "scotland" | "wales" | "northern-ireland" | null;
  notes: string;
  importantTarget: boolean;
  personalConnection: boolean;
};

/** One Airtable record: the politician, and their answer to each ask Airtable records, by the ask's slug. */
export type PoliticianRecord = { politician: SyncedPolitician; statuses: Record<string, AskStatus> };

export type PoliticianChanges = {
  added: SyncedPolitician[];
  /** Those whose records are no longer in Airtable. */
  removed: SyncedPolitician[];
  /** The politician after the change, for each one whose details changed, or whose record came back. */
  changed: SyncedPolitician[];
};

/** A record whose name changed, which may be Airtable reusing it for someone new. */
export type Renamed = { airtableId: string; from: string; to: string };

/**
 * What a sync would change, matching politicians by Airtable's record ID.
 * `before` is those whose records Airtable had last time; `gone`, the IDs of
 * those it had lost, so one that's back counts as changed.
 */
export function comparePoliticians(
  before: SyncedPolitician[],
  after: SyncedPolitician[],
  gone: ReadonlySet<string> = new Set(),
): PoliticianChanges {
  const old = new Map(before.map((p) => [p.airtableId, p]));
  const fresh = new Set(after.map((p) => p.airtableId));
  return {
    added: after.filter((p) => !old.has(p.airtableId) && !gone.has(p.airtableId)),
    removed: before.filter((p) => !fresh.has(p.airtableId)),
    changed: after.filter((p) => {
      const was = old.get(p.airtableId);
      return gone.has(p.airtableId) || (was !== undefined && JSON.stringify(was) !== JSON.stringify(p));
    }),
  };
}

/** The changed politicians whose names changed. */
export function renamedIn(before: SyncedPolitician[], changes: PoliticianChanges): Renamed[] {
  const old = new Map(before.map((p) => [p.airtableId, p]));
  return changes.changed.flatMap((p) => {
    const was = old.get(p.airtableId);
    return was && was.name !== p.name ? [{ airtableId: p.airtableId, from: was.name, to: p.name }] : [];
  });
}

/**
 * More changes than this in one sync is held for a person to check. A
 * by-election changes one or two politicians; an election, a big edit in
 * Airtable, or a broken response, changes hundreds.
 */
export const MAX_UNCHECKED_CHANGES = 20;

export function changeCount(changes: PoliticianChanges): number {
  return changes.added.length + changes.removed.length + changes.changed.length;
}
