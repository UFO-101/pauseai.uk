import "server-only";
import type { OptOutList } from "@/lib/opt-outs";
import { query, type Queryable } from "./db";

// Each time an address opted out of a mailing list, and when it opted back
// in, if it has (opt_outs). An address is opted out of a list while it has
// an open row, one at most per list. Keyed by address, not person: an
// unsubscribe can arrive before we know whose address it is. Nothing reads
// it to stop email yet.

/** What can record an opt-out. */
export type OptOutSource = "luma-webhook";

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
