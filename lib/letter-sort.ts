import type { SortColumns } from "./staff-sort";

// The letters list's sortable columns, shared by the server's query and the
// table's headings. It's newest written first unless another is chosen.

export const LETTER_SORTS: SortColumns<
  "status" | "from" | "to" | "campaign" | "consent" | "created" | "sent" | "replied"
> = {
  status: "asc",
  from: "asc",
  to: "asc",
  campaign: "asc",
  consent: "desc",
  created: "desc",
  sent: "desc",
  replied: "desc",
};
export type LetterSort = keyof typeof LETTER_SORTS;

/** Each sort's column in the query (lib/server/letters.ts). */
export const LETTER_COLUMNS: Record<LetterSort, string> = {
  status: "l.status",
  from: "f.name",
  to: "n.name",
  campaign: "c.title",
  consent: "f.contact_consent",
  created: "l.created_at",
  sent: "l.sent_at",
  replied: "l.replied_at",
};
