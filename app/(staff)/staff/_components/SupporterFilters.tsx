import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersSearch } from "@/lib/staff-search";
import { EMAIL_TOPIC_REASONS, EMAIL_TOPICS } from "@/lib/email-permissions";
import { SUPPORTER_BADGES } from "@/lib/supporters";
import FilterBar, { type Filter } from "./ui/FilterBar";

/**
 * The supporters list's filters, each named after the column it filters
 * on. A subscription's choices are each topic's reasons, then blocked.
 */
export function supporterFilters(): Filter[] {
  const copy = staffCopy.supporters.filters;
  const { columns } = staffCopy.supporters;
  return [
    {
      name: "activity",
      label: columns.badges,
      options: SUPPORTER_BADGES.map((badge) => ({ value: badge, label: staffCopy.supporters.badges[badge] })),
    },
    {
      name: "subscription",
      label: columns.subscriptions,
      options: [
        ...EMAIL_TOPICS.flatMap((topic) =>
          EMAIL_TOPIC_REASONS[topic].map((reason) => ({
            value: `${topic}:${reason}`,
            label: copy.states[topic][reason],
          })),
        ),
        { value: "blocked", label: staffCopy.supporters.subscriptions.blocked },
      ],
    },
  ];
}

/** Search and filter the supporters list. The erased notice goes with any change. */
export default function SupporterFilters({ search }: { search: SupportersSearch }) {
  return (
    <FilterBar
      path="/staff/supporters"
      values={{ ...search, erased: "" }}
      search={{ name: "q", label: staffCopy.supporters.filters.search }}
      filters={supporterFilters()}
    />
  );
}
