import type { SortColumns } from "./staff-sort";

// The politicians list's sortable columns, shared by the server's query and
// the table's headings.

export const POLITICIAN_SORTS: SortColumns<"name" | "house" | "constituency" | "party" | "letters" | "replies"> = {
  name: "asc",
  house: "asc",
  constituency: "asc",
  party: "asc",
  letters: "desc",
  replies: "desc",
};
export type PoliticianSort = keyof typeof POLITICIAN_SORTS;

/** Each sort's column in the query (lib/server/politicians.ts). */
export const POLITICIAN_COLUMNS: Record<PoliticianSort, string> = {
  name: "p.name",
  house: "p.house",
  constituency: "p.constituency",
  party: "p.party",
  letters: '"letters"',
  replies: '"replies"',
};
