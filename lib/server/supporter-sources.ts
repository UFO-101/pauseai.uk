import "server-only";
import type { SupporterSource } from "@/lib/supporters";

// Where supporters come from. Each source is a table of records about
// people (a Luma user, a letter, a member), a column of supporter_links pointing at
// it, and three views in the same shape, made in the migrations:
// supporter_source_<name> (source_id, email, name, seen_at) for the
// matcher, supporter_activity_<name> (source_id, at, kind, title, detail,
// href, status) for the history, and supporter_contact_<name> (source_id, at,
// phone, postcode, latitude, longitude, city) for contact details and places.
// supporter_identity, supporter_activity and supporter_contact union them
// all, by supporter. A new source adds itself here, a column and a widened
// CHECK to supporter_links, its views, and its arms of the union views.

export type SourceDefinition = {
  name: SupporterSource;
  /** The supporter_links column that points at the source's record. */
  column: "luma_user_id" | "letter_id" | "member_id";
  /** The column's type, for casting a source_id into it. */
  type: "text" | "bigint";
};

export const SUPPORTER_SOURCES: readonly SourceDefinition[] = [
  { name: "luma", column: "luma_user_id", type: "text" },
  { name: "letter", column: "letter_id", type: "bigint" },
  { name: "member", column: "member_id", type: "text" },
];
