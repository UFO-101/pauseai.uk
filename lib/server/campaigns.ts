import "server-only";
import { campaignBySlug } from "@/lib/email-your-mp";
import { FORM_VERSIONS } from "@/lib/content/pauseai-info-form";
import { formVersionAt } from "@/lib/old-letters";
import { query } from "./db";

// A campaign is like a mailing, from supporters rather than PauseAI: its list
// and its page's counts, and each version of its text with how many letters
// were written from it (lib/campaign-versions.ts turns them into documents).

const FAILED = "('not_sent', 'bounced')";

export type CampaignSummary = {
  slug: string;
  title: string;
  ask: string | null;
  askTitle: string | null;
  askKind: string | null;
  url: string | null;
  /** All its letters, sent, failed, replied to, and whose politician has answered its ask. */
  letters: number;
  sent: number;
  failed: number;
  replied: number;
  answered: number;
  /** How many politicians it wrote to, and supporters wrote. */
  politicians: number;
  supporters: number;
  firstAt: string | null;
  lastAt: string | null;
};

const SELECT_CAMPAIGNS = `
  SELECT c.slug, c.title, c.ask, a.title AS "askTitle", a.kind AS "askKind", c.url,
    count(l.id)::int AS letters,
    count(l.id) FILTER (WHERE l.status IN ('sent', 'spam_complaint'))::int AS sent,
    count(l.id) FILTER (WHERE l.status IN ${FAILED})::int AS failed,
    count(l.replied_at)::int AS replied,
    count(DISTINCT l.notable_person_id) FILTER (WHERE EXISTS (
      SELECT 1 FROM ask_statuses st WHERE st.notable_person_id = l.notable_person_id AND st.ask = c.ask))::int AS answered,
    count(DISTINCT l.notable_person_id)::int AS politicians,
    count(DISTINCT lower(trim(f.email)))::int AS supporters,
    min(l.created_at) AS "firstAt", max(l.created_at) AS "lastAt"
  FROM campaigns c LEFT JOIN asks a ON a.slug = c.ask LEFT JOIN letters_from_supporters s ON s.campaign = c.slug
    LEFT JOIN letters l ON l.id = s.id LEFT JOIN form_entries f ON f.id = s.entry_id`;

/** Every campaign, the most recent letter's first, those with none last. */
export async function listCampaignSummaries(): Promise<CampaignSummary[]> {
  return query<CampaignSummary>(
    `${SELECT_CAMPAIGNS} GROUP BY c.slug, a.title, a.kind ORDER BY max(l.created_at) DESC NULLS LAST, c.slug`,
  );
}

/** One campaign's counts, or undefined for none. */
export async function getCampaignSummary(slug: string): Promise<CampaignSummary | undefined> {
  const [campaign] = await query<CampaignSummary>(
    `${SELECT_CAMPAIGNS} WHERE c.slug = $1 GROUP BY c.slug, a.title, a.kind`,
    [slug],
  );
  return campaign;
}

/** A version of a campaign's text, with how many letters were written from it. */
export type CampaignVersion = { key: string; from: string | null; letters: number; subject: string; text: string };

/** How much of their letters people wrote themselves, in bands, and how many changed the text at all. */
export type OwnWordsBands = { under: number; middle: number; over: number; changed: number };

/** A campaign's letters' dates and own words: what its versions and bands are counted from. */
export async function campaignVersions(slug: string): Promise<{ versions: CampaignVersion[]; bands: OwnWordsBands }> {
  const rows = await query<{ at: Date; own: number | null }>(
    `SELECT l.created_at AS at, s.own_words AS own FROM letters_from_supporters s JOIN letters l USING (id) WHERE s.campaign = $1`,
    [slug],
  );
  const bands: OwnWordsBands = { under: 0, middle: 0, over: 0, changed: 0 };
  for (const { own } of rows) {
    if (own === null) continue;
    if (own < 0.1) bands.under++;
    else if (own <= 0.5) bands.middle++;
    else bands.over++;
    if (own > 0) bands.changed++;
  }
  const code = campaignBySlug(slug);
  if (code) {
    const text = code.letter({
      salutation: "{salutation}",
      constituency: "{constituency}",
      senderName: "{name}",
      statuses: {},
    });
    return { versions: [{ key: slug, from: null, letters: rows.length, subject: code.subject, text }], bands };
  }
  const counted = new Map<string, number>();
  for (const { at } of rows) {
    const { commit } = formVersionAt(new Date(at));
    counted.set(commit, (counted.get(commit) ?? 0) + 1);
  }
  const versions = FORM_VERSIONS.filter((version) => counted.has(version.commit))
    .map((version) => ({
      key: version.commit,
      from: version.committedAt,
      letters: counted.get(version.commit)!,
      subject: version.subject,
      text: version.text,
    }))
    .reverse();
  return { versions, bands };
}

/** The tabs of a campaign's letters, and how many are in each. */
export async function campaignTabCounts(
  slug: string,
): Promise<{ all: number; changed: number; replied: number; failed: number }> {
  const [row] = await query<{ all: number; changed: number; replied: number; failed: number }>(
    `SELECT count(*)::int AS all, count(*) FILTER (WHERE s.own_words > 0)::int AS changed, count(l.replied_at)::int AS replied,
       count(*) FILTER (WHERE l.status IN ${FAILED})::int AS failed
     FROM letters_from_supporters s JOIN letters l USING (id) WHERE s.campaign = $1`,
    [slug],
  );
  return row;
}
