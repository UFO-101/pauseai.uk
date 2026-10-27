import "server-only";
import type {
  SupporterActivity,
  SupporterBadge,
  SupporterContact,
  SupporterDetails,
  SupporterFilter,
  SupporterIdentity,
  SupporterLink,
  SupporterRow,
  SupporterSummary,
} from "@/lib/supporters";
import { SUPPORTERS_PAGE_SIZE } from "@/lib/supporters";
import { query, transaction, type Queryable } from "./db";
import { permissionsFor } from "./email-permissions";
import { refreshSupporterFacts } from "./supporter-facts";
import { SUPPORTER_SOURCES } from "./supporter-sources";
import { contains, everyWord } from "./search";

// Supporters: one per person, tied to each record about them in a source
// (supporter_links). Linking is by email, trimmed and lowercased and
// nothing more: jane+luma@ and jane@ are two people. It only adds links,
// so running it again does nothing, and a Luma user who changes their
// email stays linked by user ID.

export type LinkResult = { supportersAdded: number; linked: number };

/** Every source record with an email and no link yet, as one table of candidates. */
const CANDIDATES = SUPPORTER_SOURCES.map(
  ({ name, column }) =>
    `SELECT ${SUPPORTER_SOURCES.map((s) => (s.column === column ? `s.source_id AS ${s.column}` : `NULL::${s.type} AS ${s.column}`)).join(", ")}, s.email
     FROM supporter_source_${name} s
     WHERE s.email <> '' AND NOT EXISTS (SELECT 1 FROM supporter_links l WHERE l.${column} = s.source_id)`,
).join("\n UNION ALL\n");

const COLUMNS = SUPPORTER_SOURCES.map((s) => s.column).join(", ");
const CANDIDATE_COLUMNS = SUPPORTER_SOURCES.map((s) => `c.${s.column}`).join(", ");

/**
 * Links every unlinked source record to a supporter: to the supporter an
 * existing link matched on the same email, or else to a new one, made for
 * each new email; then brings what's worked out about each supporter it
 * linked up to date. Set-based, in one transaction (`db`'s, or its own).
 */
export async function linkSupporters(db?: Queryable): Promise<LinkResult> {
  if (!db) return transaction(linkSupporters);
  await query(`CREATE TEMP TABLE candidates ON COMMIT DROP AS ${CANDIDATES}`, [], db);
  // The email already belongs to a supporter.
  const existing = await query<{ id: number }>(
    `INSERT INTO supporter_links (supporter_id, ${COLUMNS}, matched_by, matched_value)
     SELECT DISTINCT ON (${CANDIDATE_COLUMNS}) l.supporter_id, ${CANDIDATE_COLUMNS}, 'email', c.email
     FROM candidates c JOIN supporter_links l ON l.matched_by = 'email' AND l.matched_value = c.email
     RETURNING supporter_id::int AS id`,
    [],
    db,
  );
  // A new supporter for each email nobody has, and a link for every candidate with it.
  await query(
    `CREATE TEMP TABLE new_supporters ON COMMIT DROP AS
     SELECT email, nextval(pg_get_serial_sequence('supporters', 'id')) AS id
     FROM (SELECT DISTINCT c.email FROM candidates c
           WHERE NOT EXISTS (SELECT 1 FROM supporter_links l WHERE l.matched_by = 'email' AND l.matched_value = c.email)) e`,
    [],
    db,
  );
  const added = await query(
    "INSERT INTO supporters (id) OVERRIDING SYSTEM VALUE SELECT id FROM new_supporters RETURNING id",
    [],
    db,
  );
  const fresh = await query<{ id: number }>(
    `INSERT INTO supporter_links (supporter_id, ${COLUMNS}, matched_by, matched_value)
     SELECT n.id, ${CANDIDATE_COLUMNS}, 'email', c.email FROM candidates c JOIN new_supporters n USING (email)
     RETURNING supporter_id::int AS id`,
    [],
    db,
  );
  await query("DROP TABLE candidates, new_supporters", [], db);
  const linkedTo = [...new Set([...existing, ...fresh].map((link) => link.id))];
  if (linkedTo.length > 0) await refreshSupporterFacts(db, linkedTo);
  return { supportersAdded: added.length, linked: existing.length + fresh.length };
}

const SUMMARY_COLUMNS = `s.id::int AS id, s.name, coalesce(s.emails, '{}') AS emails,
  (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1) AS email,
  s.phone, s.postcode,
  coalesce(s.sources, '{}') AS sources, s.luma_contact AS "lumaContact", s.first_seen_at AS "firstSeenAt",
  s.last_active_at AS "lastActiveAt", s.events, s.letters, s.member`;

/** When a supporter has each lozenge in the Activities column, as SupporterBadges shows them. */
const BADGE_CONDITIONS: Record<SupporterBadge, string> = {
  member: "s.member",
  lumaContact: "s.luma_contact",
  registered: "s.events > 0",
  letter: "s.letters > 0",
};

export type SupportersPage = { supporters: SupporterRow[]; total: number; pages: number };

/** One page of the list, filtered and sorted; with a `limit` of null, every one, for a download. */
export async function listSupporters(
  filter: SupporterFilter,
  limit: number | null = SUPPORTERS_PAGE_SIZE,
): Promise<SupportersPage> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (filter.search) {
    where.push(
      everyWord(
        filter.search,
        add,
        (like) =>
          `${contains("s.name", like)} OR s.phone ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(s.emails) e WHERE e ILIKE ${like})`,
      ),
    );
  }
  if (filter.activity) where.push(BADGE_CONDITIONS[filter.activity]);
  if (filter.subscription) {
    const { topic, reason } = filter.subscription;
    where.push(
      `s.id IN (SELECT i.supporter_id FROM supporter_identity i JOIN email_permissions p ON p.address = i.email
       WHERE p.reason = ${add(reason)}${topic ? ` AND p.topic = ${add(topic)}` : ""})`,
    );
  }
  const column = {
    active: "s.last_active_at",
    first: "s.first_seen_at",
    name: "s.name",
    events: "s.events",
    letters: "s.letters",
  }[filter.sort];
  const dir = filter.dir === "asc" ? "ASC" : "DESC";
  const order = `${column} ${dir} NULLS LAST, s.last_active_at DESC NULLS LAST, s.id ${dir}`;
  const rows = await query<SupporterSummary & { total: number }>(
    `SELECT ${SUMMARY_COLUMNS}, count(*) OVER ()::int AS total FROM supporters_summary s
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${order} LIMIT ${add(limit)} OFFSET ${add((filter.page - 1) * (limit ?? 0))}`,
    values,
  );
  const total = rows[0]?.total ?? 0;
  const permissions = await permissionsFor(rows.flatMap((row) => row.emails));
  return {
    supporters: rows.map(({ total, ...row }) => {
      void total;
      return { ...row, permissions: permissions.filter((p) => row.emails.includes(p.address)) };
    }),
    total,
    pages: Math.max(1, Math.ceil(total / SUPPORTERS_PAGE_SIZE)),
  };
}

/** Everything the staff page shows about one supporter, or undefined if there's no such one. */
export async function getSupporter(id: number): Promise<SupporterDetails | undefined> {
  const [summary] = await query<SupporterSummary>(
    `SELECT ${SUMMARY_COLUMNS} FROM supporters_summary s WHERE s.id = $1`,
    [id],
  );
  if (!summary) return undefined;
  const [identities, contacts, links, activity, permissions] = await Promise.all([
    query<SupporterIdentity>(
      `SELECT source, email, name, seen_at AS "seenAt" FROM supporter_identity WHERE supporter_id = $1 ORDER BY seen_at NULLS LAST, email`,
      [id],
    ),
    query<SupporterContact>(
      `SELECT source, at, phone, postcode, latitude, longitude, city FROM supporter_contact
       WHERE supporter_id = $1 AND (phone IS NOT NULL OR postcode IS NOT NULL OR latitude IS NOT NULL OR city IS NOT NULL)
       ORDER BY at DESC`,
      [id],
    ),
    query<SupporterLink>(
      `SELECT ${SUPPORTER_SOURCES.map((s) => `WHEN l.${s.column} IS NOT NULL THEN '${s.name}'`).reduce((sql, arm) => `${sql} ${arm}`, "CASE")} END AS source,
         coalesce(${SUPPORTER_SOURCES.map((s) => `l.${s.column}::text`).join(", ")}) AS "sourceId",
         l.matched_by AS "matchedBy", l.matched_value AS "matchedValue", l.linked_at AS "linkedAt"
       FROM supporter_links l WHERE l.supporter_id = $1 ORDER BY l.id`,
      [id],
    ),
    query<SupporterActivity>(
      "SELECT source, at, kind, title, detail, href, status FROM supporter_activity WHERE supporter_id = $1 ORDER BY at DESC, kind",
      [id],
    ),
    permissionsFor(summary.emails),
  ]);
  return { summary, identities, contacts, links, activity, permissions };
}
