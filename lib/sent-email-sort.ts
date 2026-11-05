import type { SortColumns } from "./staff-sort";

// The sent emails' sortable columns, shared by the server's query and the
// table's headings. It's newest first unless another is chosen.

export const SENT_EMAIL_SORTS: SortColumns<"when" | "what" | "to" | "from" | "backend" | "subject" | "outcome"> = {
  when: "desc",
  what: "asc",
  to: "asc",
  from: "asc",
  backend: "asc",
  subject: "asc",
  outcome: "asc",
};
export type SentEmailSort = keyof typeof SENT_EMAIL_SORTS;
