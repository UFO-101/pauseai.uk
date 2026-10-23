import "server-only";
import { query, type Queryable } from "./db";

// What's worked out about each supporter from all their records, kept on the
// supporter so a page can read it for every supporter at once: when they
// were first seen (the supporter_first_seen view says how). Brought up to date
// after anything that adds or removes a supporter's records.

/** Sets each supporter's first seen to what their records now say, writing only those that changed. Returns how many did. */
export async function refreshSupporterFacts(db?: Queryable): Promise<number> {
  const rows = await query(
    `UPDATE supporters s SET first_seen_at = f.first_seen_at FROM supporter_first_seen f
     WHERE f.supporter_id = s.id AND s.first_seen_at IS DISTINCT FROM f.first_seen_at RETURNING s.id`,
    [],
    db,
  );
  return rows.length;
}
