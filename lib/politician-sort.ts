import { campaigns } from "./content/email-your-mp";
import type { SortColumns } from "./staff-sort";

// The politicians list's sortable columns, shared by the server's query and
// the table's headings. Each campaign's column sorts by when their status
// for it was recorded, newest first: the dashboard counts signatures by
// the same time.

const COLUMNS = {
  name: "asc",
  house: "asc",
  constituency: "asc",
  party: "asc",
  letters: "desc",
  replies: "desc",
} as const;

/** The columns, then a campaign's slug for its column. */
export type PoliticianSort = keyof typeof COLUMNS | (string & {});

export const POLITICIAN_SORTS: SortColumns<PoliticianSort> = {
  ...COLUMNS,
  ...Object.fromEntries(campaigns.map((campaign) => [campaign.slug, "desc"])),
};

/** Each sort's column in the query (lib/server/politicians.ts). Slugs are ours, so safe in SQL. */
export const POLITICIAN_COLUMNS: Record<PoliticianSort, string> = {
  name: "p.name",
  house: "p.house",
  constituency: "p.constituency",
  party: "p.party",
  letters: '"letters"',
  replies: '"replies"',
  ...Object.fromEntries(
    campaigns.map((campaign) => [
      campaign.slug,
      `(SELECT c.updated_at FROM campaign_statuses c WHERE c.politician_id = p.id AND c.campaign = '${campaign.slug}')`,
    ]),
  ),
};
