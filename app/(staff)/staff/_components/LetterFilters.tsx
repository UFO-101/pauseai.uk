import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_FLAGS } from "@/lib/politician-filters";
import type { CampaignRow } from "@/lib/server/asks";
import { LETTER_BACKENDS, LETTER_REPLIES, LETTER_STATUSES, type LettersSearch } from "@/lib/staff-search";
import FilterBar, { type Filter } from "./ui/FilterBar";

const copy = staffCopy.letters;

/**
 * The letters list's filters, in the table's columns' order: whether it was
 * delivered, the MP's markers, `campaigns` (every one, by title; none on one
 * campaign's own page), what sent it and what came back to it. All but the status and reply repeat.
 */
export function letterFilters(campaigns: Pick<CampaignRow, "slug" | "title">[]): Filter[] {
  return [
    {
      name: "status",
      label: copy.columns.status,
      options: LETTER_STATUSES.map((status) => ({ value: status, label: copy.status[status] })),
    },
    {
      name: "flag",
      label: copy.mpFlag,
      repeat: true,
      options: POLITICIAN_FLAGS.map((flag) => ({ value: flag, label: staffCopy.politicians.flags[flag] })),
    },
    ...(campaigns.length
      ? [
          {
            name: "campaign",
            label: copy.columns.campaign,
            repeat: true,
            options: campaigns.map((campaign) => ({ value: campaign.slug, label: campaign.title })),
          },
        ]
      : []),
    {
      name: "backend",
      label: copy.columns.backend,
      repeat: true,
      options: LETTER_BACKENDS.map((backend) => ({ value: backend, label: copy.backends[backend] })),
    },
    {
      name: "answered",
      label: copy.columns.replied,
      options: LETTER_REPLIES.map((reply) => ({ value: reply, label: copy.answered[reply] })),
    },
  ];
}

/** Which of a campaign's letters its page lists: by a search of the sender and MP, then its filters. */
export default function LetterFilters({
  path,
  search,
  campaigns,
}: {
  path: string;
  search: LettersSearch;
  campaigns: Pick<CampaignRow, "slug" | "title">[];
}) {
  return (
    <FilterBar
      path={path}
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={letterFilters(campaigns)}
    />
  );
}
