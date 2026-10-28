import "server-only";
import type {
  NegatableSupporterFilter,
  SupporterActivity,
  SupporterBadge,
  SupporterContact,
  SupporterDetails,
  SupporterMp,
  SupporterFilter,
  SupporterIdentity,
  SupporterRow,
  SupporterSummary,
} from "@/lib/supporters";
import { SUPPORTERS_PAGE_SIZE } from "@/lib/supporters";
import type { Channel } from "@/lib/contact-permissions";
import { query, transaction, type Queryable } from "./db";
import { permissionsFor } from "./contact-permissions";
import { optedOutOfLuma } from "./opt-outs";
import { refreshSupporterFacts } from "./supporter-facts";
import { SUPPORTER_SOURCES } from "./supporter-sources";
import { contains, everyWord } from "./search";
import { placeFor, type FoundPlace } from "./outside-services/postcodes";

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

/**
 * Whether supporter `s` is a contact of the Luma calendar's now: they follow
 * it, and haven't opted out of its emails. The opt-out is looked up as the
 * list is read, not kept with it, so Luma's webhook saying so shows at once.
 */
const LUMA_CONTACT = `(s.luma_follows AND NOT ${optedOutOfLuma("s.emails")})`;

/**
 * A supporter's summary as staff see it, from `s`, a row shaped as
 * supporters_listed's: who they are, their addresses and numbers, what
 * they've done, and where they are (a place's name, what it's from and
 * where it is), or nulls.
 */
const SUMMARY_COLUMNS = `s.id::int AS id, s.name, coalesce(s.emails, '{}') AS emails, s.phones, s.postcode,
  coalesce(s.sources, '{}') AS sources, ${LUMA_CONTACT} AS "lumaContact", s.first_seen_at AS "firstSeenAt",
  s.last_active_at AS "lastActiveAt", s.events, s.letters, s.member,
  CASE WHEN s.basis IS NULL THEN NULL
  ELSE json_build_object('name', s.place, 'basis', s.basis, 'given', s.given, 'country', s.country,
    'latitude', s.latitude, 'longitude', s.longitude) END AS place`;

/**
 * Supporter $1's row, shaped as supporters_listed's, worked out now from
 * the views rather than read from the list's last refresh: for their page.
 */
const LIVE_SUMMARY = `(SELECT s.*,
    sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
  FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id WHERE s.id = $1) s`;

/** When a supporter has each lozenge in the Activities column, as SupporterBadges shows them. */
const BADGE_CONDITIONS: Record<SupporterBadge, string> = {
  member: "s.member",
  lumaContact: LUMA_CONTACT,
  registered: "s.events > 0",
  letter: "s.letters > 0",
  march: "'march-2026-11' = ANY(s.sources)",
};

export type SupportersPage = {
  supporters: SupporterRow[];
  total: number;
  pages: number;
  /** Where the Near filter's words are, if it's on: a place, none found, or "failed" if postcodes.io couldn't say. */
  near?: FoundPlace | null | "failed";
};

/** Miles between a supporter's place and the point `lat`, `lon` (the haversine formula, on a round Earth). */
const milesFrom = (lat: string, lon: string) =>
  `3958.8 * 2 * asin(sqrt(power(sin(radians(s.latitude - ${lat}) / 2), 2)
     + cos(radians(${lat})) * cos(radians(s.latitude)) * power(sin(radians(s.longitude - ${lon}) / 2), 2)))`;

/**
 * The conditions of the filters that repeat, those that are on: each finds
 * those with any of its values. An event is one they registered for, but
 * for declined. A contact one is an answer for any of their addresses, or
 * any of their numbers, by its channel: any for a topic, or one answer, or
 * one reason.
 */
function anyOf(filter: Pick<SupporterFilter, NegatableSupporterFilter>, add: (value: unknown) => string): string[] {
  const conditions: string[] = [];
  if (filter.activity) conditions.push(filter.activity.map((badge) => BADGE_CONDITIONS[badge]).join(" OR "));
  if (filter.contact) {
    const states = (channel: Channel) =>
      filter
        .contact!.filter((state) => state.channel === channel)
        .map(({ topic, send, reason }) => {
          const parts = [
            topic && `p.topic = ${add(topic)}`,
            send && `p.send = ${add(send)}`,
            reason && `p.reason = ${add(reason)}`,
          ];
          return `(${parts.filter(Boolean).join(" AND ")})`;
        });
    const [emails, phones] = [states("email"), states("phone")];
    const found = [
      emails.length &&
        `s.id IN (SELECT i.supporter_id FROM supporter_identity i
           JOIN email_permissions p ON p.address = i.email WHERE ${emails.join(" OR ")})`,
      phones.length &&
        `s.id IN (SELECT c.supporter_id FROM supporter_contact c
           JOIN phone_permissions p ON p.address = phone_number(c.phone) WHERE ${phones.join(" OR ")})`,
    ].filter(Boolean);
    conditions.push(found.join(" OR "));
  }
  if (filter.event) {
    conditions.push(
      `EXISTS (SELECT 1 FROM luma_guests g JOIN supporter_links k ON k.luma_user_id = g.user_id
       WHERE k.supporter_id = s.id AND g.event_id = ANY(${add(filter.event)}) AND g.approval_status <> 'declined')`,
    );
  }
  if (filter.country) conditions.push(`s.country = ANY(${add(filter.country)})`);
  return conditions.map((condition) => `(${condition})`);
}

/**
 * One page of the list, filtered and sorted; with a `limit` of null, every
 * one, for a download. Read from supporters_listed: as of the list's last
 * refresh, with anyone added since. The Near filter's words are looked up
 * at postcodes.io; a place it can't find finds no one. The page and how
 * many there are in all are two queries, at once: counting alongside the
 * page would read every row to sort them.
 */
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
          `${contains("s.name", like)} OR EXISTS (SELECT 1 FROM unnest(s.phones) n WHERE n ILIKE ${like})
           OR EXISTS (SELECT 1 FROM unnest(s.emails) e WHERE e ILIKE ${like})`,
      ),
    );
  }
  where.push(...anyOf(filter, add));
  // What's left out: a filter's condition not true, so one with no value, such as no nation, is kept.
  if (filter.not) where.push(...anyOf(filter.not, add).map((condition) => `(${condition}) IS NOT TRUE`));
  if (filter.campaign) {
    where.push(
      `${filter.wrote ? "" : "NOT "}EXISTS (SELECT 1 FROM supporter_links k JOIN letters_from_supporters l ON l.entry_id = k.form_entry_id
       WHERE k.supporter_id = s.id AND l.campaign = ${add(filter.campaign)})`,
    );
  }
  // What the Near filter's words are: a place, null for none, "failed"; or undefined with no Near filter.
  const near = filter.near ? await placeFor(filter.near.text) : undefined;
  if (near === null || near === "failed") where.push("false");
  else if (near) where.push(`${milesFrom(add(near.latitude), add(near.longitude))} <= ${add(filter.near!.miles)}`);
  const column = {
    active: "s.last_active_at",
    first: "s.first_seen_at",
    name: "s.name",
    events: "s.events",
    letters: "s.letters",
  }[filter.sort];
  const dir = filter.dir === "asc" ? "ASC" : "DESC";
  const order = `${column} ${dir} NULLS LAST, s.last_active_at DESC NULLS LAST, s.id ${dir}`;
  const filtered = `FROM supporters_listed s ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
  const counting = [...values];
  // The page's rows first, then their columns: worked out before the sort, the columns were for everyone.
  const page = `SELECT ${SUMMARY_COLUMNS} FROM (SELECT s.* ${filtered}
     ORDER BY ${order} LIMIT ${add(limit)} OFFSET ${add((filter.page - 1) * (limit ?? 0))}) s ORDER BY ${order}`;
  const [rows, [{ total }]] = await Promise.all([
    query<SupporterSummary>(page, values),
    query<{ total: number }>(`SELECT count(*)::int AS total ${filtered}`, counting),
  ]);
  const permissions = await permissionsFor(
    rows.flatMap((row) => row.emails),
    rows.flatMap((row) => row.phones),
  );
  const theirs = (row: SupporterSummary) =>
    permissions.filter((p) => (p.channel === "email" ? row.emails : row.phones).includes(p.address));
  const ids = rows.map((row) => row.id);
  // For the columns the Event and Campaign filters add: the page's registrations for the events chosen, and when
  // each first wrote in the campaign.
  const [registrations, letters] = await Promise.all([
    filter.event
      ? query<{ id: number; event: string; status: string }>(
          `SELECT k.supporter_id::int AS id, e.name AS event, g.approval_status AS status
           FROM luma_guests g JOIN supporter_links k ON k.luma_user_id = g.user_id JOIN luma_events e ON e.id = g.event_id
           WHERE k.supporter_id = ANY($1) AND g.event_id = ANY($2) ORDER BY e.start_at, e.id`,
          [ids, filter.event],
        )
      : [],
    filter.campaign && filter.wrote
      ? query<{ id: number; at: string }>(
          `SELECT k.supporter_id::int AS id, min(f.created_at) AS at
           FROM supporter_links k JOIN letters_from_supporters l ON l.entry_id = k.form_entry_id
           JOIN form_entries f ON f.id = l.entry_id
           WHERE k.supporter_id = ANY($1) AND l.campaign = $2 GROUP BY k.supporter_id`,
          [ids, filter.campaign],
        )
      : [],
  ]);
  return {
    supporters: rows.map((row) => ({
      ...row,
      permissions: theirs(row),
      ...(filter.event && {
        registrations: registrations.filter((r) => r.id === row.id).map(({ event, status }) => ({ event, status })),
      }),
      // The filter found only those who wrote in it, so every row has a letter.
      ...(filter.campaign && filter.wrote && { wroteAt: letters.find((l) => l.id === row.id)!.at }),
    })),
    total,
    pages: Math.max(1, Math.ceil(total / SUPPORTERS_PAGE_SIZE)),
    ...(near !== undefined && { near }),
  };
}

/** A Luma event to filter supporters by: its ID, name and when it starts. */
export type EventChoice = { id: string; name: string; startAt: string };

/** Our Luma events, newest first, for the Event filter: those we manage, whose guests we know. */
export async function eventChoices(): Promise<EventChoice[]> {
  return query<EventChoice>(
    `SELECT id, name, start_at AS "startAt" FROM luma_events
     WHERE access = 'manage' AND removed_at IS NULL ORDER BY start_at DESC, id`,
  );
}

/** Everything the staff page shows about one supporter, or undefined if there's no such one. */
export async function getSupporter(id: number): Promise<SupporterDetails | undefined> {
  const [summary] = await query<SupporterSummary>(`SELECT ${SUMMARY_COLUMNS} FROM ${LIVE_SUMMARY}`, [id]);
  if (!summary) return undefined;
  const postcode = summary.place?.basis === "postcode" ? summary.place.given : null;
  const [identities, contacts, activity, permissions, [mp]] = await Promise.all([
    query<SupporterIdentity>(
      `SELECT source, email, name, seen_at AS "seenAt" FROM supporter_identity WHERE supporter_id = $1 ORDER BY seen_at NULLS LAST, email`,
      [id],
    ),
    query<SupporterContact>(
      `SELECT source, at, phone_number(phone) AS phone, postcode, latitude, longitude, city FROM supporter_contact
       WHERE supporter_id = $1 AND (phone IS NOT NULL OR postcode IS NOT NULL OR latitude IS NOT NULL OR city IS NOT NULL)
       ORDER BY at DESC`,
      [id],
    ),
    query<SupporterActivity>(
      "SELECT source, at, kind, title, detail, href, status FROM supporter_activity WHERE supporter_id = $1 ORDER BY at DESC, kind",
      [id],
    ),
    permissionsFor(summary.emails, summary.phones),
    // Their MP, in office for their postcode's constituency.
    postcode
      ? query<SupporterMp>(
          `SELECT n.id::int AS id, n.name, p.constituency, p.party FROM postcode_places pp
           JOIN politicians p ON p.constituency = pp.constituency AND p.house = 'commons' AND NOT p.is_test
           JOIN notable_people n ON n.id = p.id AND n.status = 'in_office'
           WHERE pp.postcode = upper(replace($1, ' ', '')) LIMIT 1`,
          [postcode],
        )
      : [],
  ]);
  return { summary, mp: mp ?? null, identities, contacts, activity, permissions };
}
