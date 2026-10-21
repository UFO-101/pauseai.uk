import "server-only";
import { OPT_OUT_LISTS } from "@/lib/opt-outs";
import type {
  SupporterActivity,
  SupporterContact,
  SupporterDetails,
  SupporterFilter,
  SupporterIdentity,
  SupporterLink,
  SupporterOptOut,
  SupporterSummary,
} from "@/lib/supporters";
import { SUPPORTERS_PAGE_SIZE } from "@/lib/supporters";
import { query, transaction, type Queryable } from "./db";
import { SUPPORTER_SOURCES } from "./supporter-sources";

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
 * each new email. Set-based, in one transaction (`db`'s, or its own).
 */
export async function linkSupporters(db?: Queryable): Promise<LinkResult> {
  if (!db) return transaction(linkSupporters);
  await query(`CREATE TEMP TABLE candidates ON COMMIT DROP AS ${CANDIDATES}`, [], db);
  // The email already belongs to a supporter.
  const existing = await query(
    `INSERT INTO supporter_links (supporter_id, ${COLUMNS}, matched_by, matched_value)
     SELECT DISTINCT ON (${CANDIDATE_COLUMNS}) l.supporter_id, ${CANDIDATE_COLUMNS}, 'email', c.email
     FROM candidates c JOIN supporter_links l ON l.matched_by = 'email' AND l.matched_value = c.email
     RETURNING id`,
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
  const fresh = await query(
    `INSERT INTO supporter_links (supporter_id, ${COLUMNS}, matched_by, matched_value)
     SELECT n.id, ${CANDIDATE_COLUMNS}, 'email', c.email FROM candidates c JOIN new_supporters n USING (email)
     RETURNING id`,
    [],
    db,
  );
  await query("DROP TABLE candidates, new_supporters", [], db);
  return { supportersAdded: added.length, linked: existing.length + fresh.length };
}

const SUMMARY_COLUMNS = `s.id::int AS id, s.name, coalesce(s.emails, '{}') AS emails, s.phone, s.postcode,
  coalesce(s.sources, '{}') AS sources, s.luma_contact AS "lumaContact", s.first_seen_at AS "firstSeenAt",
  s.last_active_at AS "lastActiveAt", s.events, s.letters, coalesce(s.opted_out, '{}') AS "optedOut"`;

export type SupportersPage = { supporters: SupporterSummary[]; total: number; pages: number };

/** One page of the list, filtered and sorted. */
export async function listSupporters(filter: SupporterFilter): Promise<SupportersPage> {
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (filter.search) {
    const like = add(`%${filter.search}%`);
    where.push(
      `(s.name ILIKE ${like} OR s.phone ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(s.emails) e WHERE e ILIKE ${like}))`,
    );
  }
  if (filter.source) where.push(`${add(filter.source)} = ANY(s.sources)`);
  if (filter.registered) where.push("s.events > 0");
  if (filter.active === "older") where.push("s.last_active_at <= now() - interval '365 days'");
  else if (filter.active) where.push(`s.last_active_at > now() - ${add(`${filter.active} days`)}::interval`);
  if (filter.from) where.push(`s.first_seen_at >= ${add(filter.from)}::date`);
  if (filter.to) where.push(`s.first_seen_at < ${add(filter.to)}::date + 1`);
  if (filter.unsubscribed) where.push("s.opted_out IS NOT NULL");
  if (filter.hasPostcode) where.push("s.postcode IS NOT NULL");
  const order = {
    active: "s.last_active_at DESC NULLS LAST, s.id DESC",
    first: "s.first_seen_at ASC NULLS LAST, s.id ASC",
    name: "s.name ASC NULLS LAST, s.id ASC",
  }[filter.sort];
  const rows = await query<SupporterSummary & { total: number }>(
    `SELECT ${SUMMARY_COLUMNS}, count(*) OVER ()::int AS total FROM supporters_summary s
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${order} LIMIT ${add(SUPPORTERS_PAGE_SIZE)} OFFSET ${add((filter.page - 1) * SUPPORTERS_PAGE_SIZE)}`,
    values,
  );
  const total = rows[0]?.total ?? 0;
  return {
    supporters: rows.map(({ total, ...row }) => {
      void total;
      return row;
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
  const [identities, contacts, links, activity, optOuts] = await Promise.all([
    query<SupporterIdentity>(
      `SELECT source, email, name, seen_at AS "seenAt" FROM supporter_identity WHERE supporter_id = $1 ORDER BY seen_at NULLS LAST, email`,
      [id],
    ),
    query<SupporterContact>(
      `SELECT source, at, phone, postcode, latitude, longitude FROM supporter_contact
       WHERE supporter_id = $1 AND (phone IS NOT NULL OR postcode IS NOT NULL OR latitude IS NOT NULL) ORDER BY at DESC`,
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
      "SELECT source, at, kind, title, detail, href FROM supporter_activity WHERE supporter_id = $1 ORDER BY at DESC, kind",
      [id],
    ),
    query<{ list: string; address: string; since: string; source: string }>(
      `SELECT o.list, o.address, o.unsubscribed_at AS since, o.source FROM opt_outs o
       WHERE o.resubscribed_at IS NULL AND o.address IN (SELECT email FROM supporter_identity WHERE supporter_id = $1)`,
      [id],
    ),
  ]);
  // Every list we know of, for every address: opted out or not.
  const lists: SupporterOptOut[] = OPT_OUT_LISTS.flatMap((list) =>
    summary.emails.map((address) => {
      const open = optOuts.find((o) => o.list === list && o.address === address);
      return { list, address, since: open?.since ?? null, source: open?.source ?? null };
    }),
  );
  return { summary, identities, contacts, links, activity, optOuts: lists };
}
