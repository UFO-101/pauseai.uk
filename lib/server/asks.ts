import "server-only";
import { askSlug, FIXED_ASKS, type Asker, type AskKind, type AskStatus } from "@/lib/asks";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";

// The asks and campaigns in the database (lib/asks.ts), for the staff
// interface. Staff add, change and delete asks; a migration adds each
// campaign, and the asks the code names.

export type Ask = {
  slug: string;
  title: string;
  kind: AskKind;
  /** yyyy-mm-dd, the event's or the letter's, if known. */
  date: string | null;
  /** Where to read the letter or see the event: a path of ours, or another site's page. */
  url: string | null;
  /** Who asks it. */
  askedBy: Asker[];
};

/** An ask, with how many people have given each answer, how many were written to, and how many campaigns and mailings put it. */
export type AskWithCounts = Ask & {
  counts: Partial<Record<AskStatus, number>>;
  writtenTo: number;
  campaigns: number;
  mailings: number;
};

/** A campaign's row: its title, and the ask it makes, if any. */
export type CampaignRow = { slug: string; title: string; ask: string | null };

const ASK_COLUMNS = `a.slug, a.title, a.kind, to_char(a.date, 'YYYY-MM-DD') AS date, a.url, a.asked_by AS "askedBy"`;

/** Every ask, newest first, those without a date last. */
export async function listAsks(): Promise<Ask[]> {
  return query<Ask>(`SELECT ${ASK_COLUMNS} FROM asks a ORDER BY a.date DESC NULLS LAST, a.title`);
}

/** Every ask, as listAsks() orders them, with how many have each status. */
export async function asksWithCounts(): Promise<AskWithCounts[]> {
  return query<AskWithCounts>(
    `SELECT ${ASK_COLUMNS},
       coalesce((SELECT json_object_agg(c.status, c.count) FROM (
         SELECT s.status, count(*)::int AS count FROM ask_statuses s WHERE s.ask = a.slug GROUP BY s.status
       ) c), '{}') AS counts, ${HOW_ASKED}
     FROM asks a ORDER BY a.date DESC NULLS LAST, a.title`,
  );
}

/** One row's written-to count and the campaigns and mailings that put it. */
const HOW_ASKED = `
  (SELECT count(DISTINCT l.notable_person_id)::int FROM letters l
     LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN campaigns c ON c.slug = s.campaign
     LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
   WHERE c.ask = a.slug OR m.ask = a.slug) AS "writtenTo",
  (SELECT count(*)::int FROM campaigns c WHERE c.ask = a.slug) AS campaigns,
  (SELECT count(*)::int FROM mailings m WHERE m.ask = a.slug AND m.state <> 'draft') AS mailings`;

/** A campaign or mailing that put an ask: its link, name, dates and letters. */
export type AskWay = {
  kind: "campaign" | "mailing";
  href: string;
  title: string;
  from: string | null;
  to: string | null;
  letters: number;
};

/** A politician's answer to an ask. */
export type AskAnswer = {
  politicianId: number;
  name: string;
  constituency: string | null;
  party: string | null;
  /** Null for someone written to who hasn't answered. */
  status: AskStatus | null;
  /** When a campaign or mailing that put the ask last wrote to them; null if none has. */
  lastWrittenTo: string | null;
};

/** Who the campaigns and mailings that put ask $1 wrote to, and when they last did. */
const WRITTEN_TO = `written AS (
  SELECT l.notable_person_id AS id, max(coalesce(l.sent_at, l.created_at)) AS at
  FROM letters l
    LEFT JOIN letters_from_supporters s ON s.id = l.id LEFT JOIN campaigns c ON c.slug = s.campaign
    LEFT JOIN letters_from_pauseai p ON p.id = l.id LEFT JOIN mailings m ON m.id = p.mailing_id
  WHERE c.ask = $1 OR m.ask = $1 GROUP BY 1
)`;

/** An ask's own page: its counts, how many written to haven't answered, how it was put, by date, and a page of its answers. */
export type AskPageData = AskWithCounts & { fixed: boolean; noAnswer: number; ways: AskWay[]; answers: AskAnswer[] };

/**
 * The ask with `slug`, for its page, or undefined for none. Its answers are
 * those of `status`, or with none or blank, all; or with "none", those written
 * to who haven't answered, whoever was written to longest ago first.
 */
export async function askPageData(slug: string, status?: string): Promise<AskPageData | undefined> {
  const [ask] = await query<AskWithCounts>(
    `SELECT ${ASK_COLUMNS},
       coalesce((SELECT json_object_agg(c.status, c.count) FROM (
         SELECT s.status, count(*)::int AS count FROM ask_statuses s WHERE s.ask = a.slug GROUP BY s.status
       ) c), '{}') AS counts, ${HOW_ASKED}
     FROM asks a WHERE a.slug = $1`,
    [slug],
  );
  if (!ask) return undefined;
  const [ways, answers, [{ noAnswer }]] = await Promise.all([
    query<AskWay>(
      `SELECT * FROM (
         SELECT 'campaign' AS kind, '/staff/campaigns/' || c.slug AS href, c.title, min(l.created_at) AS "from", max(l.created_at) AS "to", count(l.id)::int AS letters
         FROM campaigns c LEFT JOIN letters_from_supporters s ON s.campaign = c.slug LEFT JOIN letters l ON l.id = s.id
         WHERE c.ask = $1 GROUP BY c.slug
         UNION ALL
         SELECT 'mailing', '/staff/mailings/' || m.id, m.title, min(coalesce(l.sent_at, l.created_at)), max(coalesce(l.sent_at, l.created_at)), count(l.id)::int
         FROM mailings m LEFT JOIN letters_from_pauseai p ON p.mailing_id = m.id LEFT JOIN letters l ON l.id = p.id
         WHERE m.ask = $1 AND m.state <> 'draft' GROUP BY m.id
       ) ways ORDER BY "to" DESC NULLS LAST, title`,
      [slug],
    ),
    query<AskAnswer>(
      `WITH ${WRITTEN_TO}
       SELECT n.id::int AS "politicianId", n.name, p.constituency, p.party, s.status, w.at AS "lastWrittenTo"
       FROM notable_people n
         LEFT JOIN politicians p ON p.id = n.id
         LEFT JOIN ask_statuses s ON s.notable_person_id = n.id AND s.ask = $1
         LEFT JOIN written w ON w.id = n.id
       WHERE CASE WHEN $2::text = 'none' THEN w.id IS NOT NULL AND s.status IS NULL
         ELSE s.status IS NOT NULL AND ($2::text IS NULL OR s.status = $2::text) END
       ORDER BY CASE WHEN $2::text = 'none' THEN w.at END, n.name LIMIT 200`,
      [slug, status || null],
    ),
    query<{ noAnswer: number }>(
      `WITH ${WRITTEN_TO}
       SELECT count(*)::int AS "noAnswer" FROM written w
       WHERE NOT EXISTS (SELECT 1 FROM ask_statuses s WHERE s.notable_person_id = w.id AND s.ask = $1)`,
      [slug],
    ),
  ]);
  return { ...ask, fixed: FIXED_ASKS.includes(slug), noAnswer, ways, answers };
}

/** Every campaign, by title. */
export async function listCampaigns(): Promise<CampaignRow[]> {
  return query<CampaignRow>("SELECT slug, title, ask FROM campaigns ORDER BY title");
}

/** What staff give for an ask: everything but its slug, which is made from its title and date. */
export type AskInput = Omit<Ask, "slug">;

/** Why an ask wasn't saved or deleted: one the code names, its kind while it has answers, or one in use. */
export type AskChange =
  { saved: true; slug: string } | { saved: false; reason: "fixed" | "kind-in-use" | "in-use" | "gone" };

/** What refers to an ask: answers to it, campaigns and mailings. */
async function uses(slug: string, db?: Queryable): Promise<{ answers: number; others: number }> {
  const [row] = await query<{ answers: number; others: number }>(
    `SELECT (SELECT count(*)::int FROM ask_statuses WHERE ask = $1) AS answers,
       (SELECT count(*)::int FROM campaigns WHERE ask = $1) + (SELECT count(*)::int FROM mailings WHERE ask = $1) AS others`,
    [slug],
    db,
  );
  return row;
}

/**
 * Adds an ask, as `by`, its slug made from its title and date, with a
 * number after it if that's taken. Logs it.
 */
export async function addAsk(input: AskInput, by: string): Promise<AskChange> {
  return transaction(async (db) => {
    const base = askSlug(input.title, input.date);
    const taken = await query<{ slug: string }>(
      "SELECT slug FROM asks WHERE slug = $1 OR slug LIKE $1 || '-%'",
      [base],
      db,
    );
    let slug = base;
    for (let n = 2; taken.some((row) => row.slug === slug); n++) slug = `${base}-${n}`;
    await query(
      "INSERT INTO asks (slug, title, kind, date, url, asked_by) VALUES ($1, $2, $3, $4, $5, $6)",
      [slug, input.title, input.kind, input.date, input.url, input.askedBy],
      db,
    );
    await logChange(by, "add ask", { slug, ...input }, db);
    return { saved: true, slug };
  });
}

/**
 * Changes an ask, as `by`, but for its slug; not one the code names, nor
 * its kind while anyone has an answer to it. Logs it.
 */
export async function editAsk(slug: string, input: AskInput, by: string): Promise<AskChange> {
  if (FIXED_ASKS.includes(slug)) return { saved: false, reason: "fixed" };
  return transaction(async (db) => {
    const [ask] = await query<{ kind: string }>("SELECT kind FROM asks WHERE slug = $1 FOR UPDATE", [slug], db);
    if (!ask) return { saved: false, reason: "gone" };
    if (ask.kind !== input.kind && (await uses(slug, db)).answers > 0) return { saved: false, reason: "kind-in-use" };
    await query(
      "UPDATE asks SET title = $2, kind = $3, date = $4, url = $5, asked_by = $6 WHERE slug = $1",
      [slug, input.title, input.kind, input.date, input.url, input.askedBy],
      db,
    );
    await logChange(by, "edit ask", { slug, ...input }, db);
    return { saved: true, slug };
  });
}

/** Deletes an ask, as `by`, while nothing refers to it; not one the code names. Logs it. */
export async function deleteAsk(slug: string, by: string): Promise<AskChange> {
  if (FIXED_ASKS.includes(slug)) return { saved: false, reason: "fixed" };
  return transaction(async (db) => {
    const [ask] = await query<Ask>(`SELECT ${ASK_COLUMNS} FROM asks a WHERE a.slug = $1 FOR UPDATE`, [slug], db);
    if (!ask) return { saved: false, reason: "gone" };
    const used = await uses(slug, db);
    if (used.answers + used.others > 0) return { saved: false, reason: "in-use" };
    await query("DELETE FROM asks WHERE slug = $1", [slug], db);
    await logChange(by, "delete ask", ask, db);
    return { saved: true, slug };
  });
}

/** One ask, if there is one, with whether staff can change it, its kind, or delete it. */
export async function askToEdit(
  slug: string,
): Promise<(Ask & { fixed: boolean; kindFixed: boolean; deletable: boolean }) | undefined> {
  const [ask] = await query<Ask>(`SELECT ${ASK_COLUMNS} FROM asks a WHERE a.slug = $1`, [slug]);
  if (!ask) return undefined;
  const used = await uses(slug);
  const fixed = FIXED_ASKS.includes(slug);
  return { ...ask, fixed, kindFixed: used.answers > 0, deletable: !fixed && used.answers + used.others === 0 };
}
