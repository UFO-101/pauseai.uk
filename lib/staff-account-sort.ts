import type { SortColumns } from "./staff-sort";

// The staff accounts' sortable columns, shared by the server's query and the
// table's headings. It's by address unless another is chosen.

export const ACCOUNT_SORTS: SortColumns<"email" | "added" | "lastLogin" | "lastSeen" | "sessions"> = {
  email: "asc",
  added: "desc",
  lastLogin: "desc",
  lastSeen: "desc",
  sessions: "desc",
};
export type AccountSort = keyof typeof ACCOUNT_SORTS;
