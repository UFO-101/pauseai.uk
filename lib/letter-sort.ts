import type { SortColumns } from "./staff-sort";

// The letters list's sortable columns, shared by the server's query and the
// table's headings. It's newest written first unless another is chosen.

export const LETTER_SORTS: SortColumns<
  "status" | "from" | "to" | "campaign" | "ownWords" | "backend" | "consent" | "created" | "sent" | "replied"
> = {
  status: "asc",
  from: "asc",
  to: "asc",
  campaign: "asc",
  ownWords: "desc",
  backend: "asc",
  consent: "desc",
  created: "desc",
  sent: "desc",
  replied: "desc",
};
export type LetterSort = keyof typeof LETTER_SORTS;

/** When a letter `l` first got an automatic reply, if it has. */
export const AUTO_REPLIED_AT =
  "(SELECT min(e.at) FROM letter_events e WHERE e.letter_id = l.id AND e.status = 'auto_reply')";

/**
 * Each sort's column in the query (lib/server/letters.ts). The reply's is
 * the date the list shows: a written reply's, or failing one an automatic reply's.
 */
export const LETTER_COLUMNS: Record<LetterSort, string> = {
  status: "l.status",
  from: "f.name",
  to: "n.name",
  campaign: "c.title",
  ownWords: "s.own_words",
  backend: '"backend"',
  consent: "f.contact_consent",
  created: "l.created_at",
  sent: "l.sent_at",
  replied: `coalesce(l.replied_at, ${AUTO_REPLIED_AT})`,
};
