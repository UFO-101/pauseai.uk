import type { SortColumns } from "./staff-sort";

// The audit log's sortable columns, shared by the server's query and the
// table's headings. It's newest first unless another is chosen.

export const CHANGE_SORTS: SortColumns<"day" | "actor" | "action"> = { day: "desc", actor: "asc", action: "asc" };
export type ChangeSort = keyof typeof CHANGE_SORTS;
