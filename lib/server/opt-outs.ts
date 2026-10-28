import "server-only";
import type { OptOutList } from "@/lib/opt-outs";
import { query, type Queryable } from "./db";

// Each time an address opted out of a mailing list, and when it opted back
// in, if it has (opt_outs). An address is opted out of a list while it has
// an open row, one at most per list. Keyed by address, not person: an
// unsubscribe can arrive before we know whose address it is. Nothing reads
// it to stop email yet.

/** What can record an opt-out: Luma's webhook, or a full pass over the calendar's contacts. */
export type OptOutSource = "luma-webhook" | "luma-contacts";

export type OptOut = {
  address: string;
  list: OptOutList;
  source: OptOutSource;
  /** The source's own ID for it, so the same news told twice is kept once. */
  sourceRef: string;
  unsubscribedAt: Date;
};

/** The address as the table keeps it: trimmed and lowercased. */
export function normaliseAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Records an opt-out. Returns false, keeping nothing, when the source has
 * told us this one before, or the address is already opted out of the list.
 */
export async function recordOptOut(optOut: OptOut, db?: Queryable): Promise<boolean> {
  const rows = await query(
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id`,
    [normaliseAddress(optOut.address), optOut.list, optOut.source, optOut.sourceRef, optOut.unsubscribedAt],
    db,
  );
  return rows.length > 0;
}

/** Closes the address's open opt-out from a list, if it has one. Returns whether it did. */
export async function recordResubscribe(
  address: string,
  list: OptOutList,
  resubscribedAt: Date,
  db?: Queryable,
): Promise<boolean> {
  const rows = await query(
    `UPDATE opt_outs SET resubscribed_at = $3
     WHERE address = $1 AND list = $2 AND resubscribed_at IS NULL RETURNING id`,
    [normaliseAddress(address), list, resubscribedAt],
    db,
  );
  return rows.length > 0;
}

/**
 * Brings the Luma calendar's opt-outs into line with a complete pass over
 * its contacts, begun at `passStartedAt`. Luma takes someone off its list
 * when they unsubscribe or we remove or block them, and puts them back as
 * they were when they follow again, and its webhook tells us of neither
 * every time. So an address whose contact the pass didn't list is opted
 * out, from now, unless it already is; and an open opt-out begun before the
 * pass listed the address again is closed, from then. Returns how many
 * opt-outs that opened or closed.
 */
export async function recordContactsPass(passStartedAt: Date, db?: Queryable): Promise<number> {
  const gone = await query(
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
     SELECT DISTINCT ON (p.email) p.email, 'luma-calendar', 'luma-contacts', p.user_id || ' ' || $2, now()
     FROM luma_people p
     WHERE p.contact_since IS NOT NULL AND (p.contact_seen_at IS NULL OR p.contact_seen_at < $1::timestamptz)
       AND NOT EXISTS (SELECT 1 FROM luma_people q WHERE q.email = p.email AND q.contact_seen_at >= $1::timestamptz)
     ORDER BY p.email, p.user_id
     ON CONFLICT DO NOTHING RETURNING id`,
    [passStartedAt, passStartedAt.toISOString()],
    db,
  );
  const back = await query(
    `UPDATE opt_outs o SET resubscribed_at = p.seen
     FROM (SELECT email, max(contact_seen_at) AS seen FROM luma_people
           WHERE contact_seen_at >= $1 GROUP BY email) p
     WHERE o.address = p.email AND o.list = 'luma-calendar' AND o.resubscribed_at IS NULL
       AND o.unsubscribed_at < p.seen
     RETURNING o.id`,
    [passStartedAt],
    db,
  );
  return gone.length + back.length;
}

/**
 * SQL that's true while any of the addresses in `emails` (an SQL array) has
 * opted out of the Luma calendar's emails: for whether a supporter is a
 * Luma contact now, which the supporters list works out as it's read.
 */
export function optedOutOfLuma(emails: string): string {
  return `EXISTS (SELECT 1 FROM opt_outs o
    WHERE o.list = 'luma-calendar' AND o.resubscribed_at IS NULL AND o.address = ANY(${emails}))`;
}
