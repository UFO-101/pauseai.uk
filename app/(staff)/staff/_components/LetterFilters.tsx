import { staffCopy } from "@/lib/content/staff-interface";
import { POLITICIAN_FLAGS } from "@/lib/politician-filters";
import type { CampaignRow } from "@/lib/server/asks";
import { LETTER_BACKENDS, type LettersSearch } from "@/lib/staff-search";
import FilterBar, { type Filter } from "./ui/FilterBar";

const copy = staffCopy.letters;

/**
 * The letters list's filters, in the table's columns' order: its status,
 * the MP's markers, `campaigns` (every one, by title), what sent it, the
 * sender's consent and whether the MP replied. All but the status, consent
 * and reply repeat.
 */
export function letterFilters(campaigns: Pick<CampaignRow, "slug" | "title">[]): Filter[] {
  return [
    {
      name: "status",
      label: copy.columns.status,
      options: Object.entries(copy.status).map(([value, label]) => ({ value, label })),
    },
    {
      name: "flag",
      label: copy.mpFlag,
      repeat: true,
      options: POLITICIAN_FLAGS.map((flag) => ({ value: flag, label: staffCopy.politicians.flags[flag] })),
    },
    {
      name: "campaign",
      label: copy.columns.campaign,
      repeat: true,
      options: campaigns.map((campaign) => ({ value: campaign.slug, label: campaign.title })),
    },
    {
      name: "backend",
      label: copy.columns.backend,
      repeat: true,
      options: LETTER_BACKENDS.map((backend) => ({ value: backend, label: copy.backends[backend] })),
    },
    {
      name: "consent",
      label: copy.columns.consent,
      options: [
        { value: "yes", label: copy.consent.yes },
        { value: "no", label: copy.consent.no },
      ],
    },
    {
      name: "answered",
      label: copy.columns.replied,
      options: [
        { value: "yes", label: copy.answered.yes },
        { value: "no", label: copy.answered.no },
      ],
    },
  ];
}

/** Which letters the letters page lists: by a search of the sender and MP, then its filters. */
export default function LetterFilters({
  search,
  campaigns,
}: {
  search: LettersSearch;
  campaigns: Pick<CampaignRow, "slug" | "title">[];
}) {
  return (
    <FilterBar
      path="/staff/letters"
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={letterFilters(campaigns)}
    />
  );
}
