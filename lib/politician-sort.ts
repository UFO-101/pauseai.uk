import type { SortColumns } from "./staff-sort";

// The politicians list's sortable columns, shared by the server's query and
// the table's headings. The Asks column sorts by when their newest answer
// was recorded, newest first: the dashboard counts signatures by the same
// time. First and last activity sort by the times POLITICIAN_ACTIVITY in
// lib/server/politicians.ts gives.

export const POLITICIAN_SORTS: SortColumns<
  "name" | "house" | "constituency" | "party" | "letters" | "replies" | "asks" | "first" | "active"
> = {
  name: "asc",
  house: "asc",
  constituency: "asc",
  party: "asc",
  letters: "desc",
  replies: "desc",
  asks: "desc",
  first: "asc",
  active: "desc",
};
export type PoliticianSort = keyof typeof POLITICIAN_SORTS;

/** Each sort's column in the query (lib/server/politicians.ts). */
export const POLITICIAN_COLUMNS: Record<PoliticianSort, string> = {
  name: "n.name",
  house: "p.house",
  constituency: "p.constituency",
  party: "p.party",
  letters: '"letters"',
  replies: '"replies"',
  asks: "(SELECT max(a.updated_at) FROM ask_statuses a WHERE a.notable_person_id = n.id)",
  first: '"firstActivityAt"',
  active: '"lastActivityAt"',
};
