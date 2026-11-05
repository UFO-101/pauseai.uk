import "server-only";
import { now } from "@/lib/now";
import type { Permission } from "@/lib/staff-permissions";
import { NEW_FOR_DAYS, pagesFor, type StaffPageId } from "@/lib/staff-sections";
import { query } from "./db";

// The "new" tag on the staff navigation: a row for each account and page,
// with when they first saw it. A page added to the navigation has none, so
// it's new to whoever sees it next. An account with no rows at all is new
// itself, and its pages are all marked as long since seen.

/** Long before any page, for an account's first pages. */
const LONG_AGO = "2000-01-01";

/** Which of the pages `email` can open first showed to them in the last few days, noting any they haven't seen. */
export async function newPagesFor(email: string, permissions: readonly Permission[]): Promise<StaffPageId[]> {
  const pages = pagesFor(permissions);
  const seen = await query<{ page: StaffPageId; at: Date }>(
    `SELECT page, first_seen_at AS at FROM staff_nav_seen WHERE email = $1`,
    [email],
  );
  const at = now();
  const known = new Set(seen.map((row) => row.page));
  const first = seen.length === 0 ? LONG_AGO : at.toISOString();
  const fresh = pages.filter((page) => !known.has(page));
  await query(
    `INSERT INTO staff_nav_seen (email, page, first_seen_at)
     SELECT $1, unnest($2::text[]), $3 ON CONFLICT DO NOTHING`,
    [email, fresh, first],
  );
  const since = at.getTime() - NEW_FOR_DAYS * 24 * 60 * 60_000;
  const recent = seen.filter((row) => new Date(row.at).getTime() > since).map((row) => row.page);
  return pages.filter((page) => recent.includes(page) || (seen.length > 0 && fresh.includes(page)));
}
