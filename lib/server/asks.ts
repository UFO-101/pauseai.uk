import "server-only";
import type { AskKind, AskStatus } from "@/lib/asks";
import { query } from "./db";

// The asks and campaigns in the database (lib/asks.ts), for the staff
// interface. A migration adds each.

export type Ask = {
  slug: string;
  title: string;
  kind: AskKind;
  /** yyyy-mm-dd, the event's or the letter's, if known. */
  date: string | null;
};

/** An ask, with how many people have given each answer. */
export type AskWithCounts = Ask & { counts: Partial<Record<AskStatus, number>> };

/** A campaign's row: its title, and the ask it makes, if any. */
export type CampaignRow = { slug: string; title: string; ask: string | null };

const SELECT_ASKS = `SELECT a.slug, a.title, a.kind, to_char(a.date, 'YYYY-MM-DD') AS date FROM asks a`;

/** Every ask, newest first, those without a date last. */
export async function listAsks(): Promise<Ask[]> {
  return query<Ask>(`${SELECT_ASKS} ORDER BY a.date DESC NULLS LAST, a.title`);
}

/** Every ask, as listAsks() orders them, with how many have each status. */
export async function asksWithCounts(): Promise<AskWithCounts[]> {
  return query<AskWithCounts>(
    `SELECT a.slug, a.title, a.kind, to_char(a.date, 'YYYY-MM-DD') AS date,
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
