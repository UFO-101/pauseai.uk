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

/** An ask, with how many people have given each answer. */
export type AskWithCounts = Ask & { counts: Partial<Record<AskStatus, number>> };

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
       ) c), '{}') AS counts
     FROM asks a ORDER BY a.date DESC NULLS LAST, a.title`,
  );
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
