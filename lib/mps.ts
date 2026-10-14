// MPs as the Email your MP tool stores them, copied from Airtable
// (lib/server/airtable.ts), and what a sync would change.

/** An MP as we store them. */
export type SyncedMp = {
  /** Airtable's record ID. */
  airtableId: string;
  name: string;
  salutation: string;
  constituency: string;
  party: string;
  email: string | null;
};

export type MpChanges = {
  added: SyncedMp[];
  removed: SyncedMp[];
  /** The MP after the change, for each one whose details changed. */
  changed: SyncedMp[];
};

/** What a sync would change, matching MPs by Airtable's record ID. */
export function compareMps(before: SyncedMp[], after: SyncedMp[]): MpChanges {
  const old = new Map(before.map((mp) => [mp.airtableId, mp]));
  const fresh = new Set(after.map((mp) => mp.airtableId));
  return {
    added: after.filter((mp) => !old.has(mp.airtableId)),
    removed: before.filter((mp) => !fresh.has(mp.airtableId)),
    changed: after.filter((mp) => {
      const was = old.get(mp.airtableId);
      return was !== undefined && JSON.stringify(was) !== JSON.stringify(mp);
    }),
  };
}

/**
 * More changes than this in one sync is held for a person to check. A
 * by-election changes one or two MPs; a general election, a big edit in
 * Airtable, or a broken response, changes hundreds.
 */
export const MAX_UNCHECKED_CHANGES = 20;

export function changeCount(changes: MpChanges): number {
  return changes.added.length + changes.removed.length + changes.changed.length;
}
