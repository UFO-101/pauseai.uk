import { campaigns } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import type { LettersSearch } from "@/lib/staff-search";
import FilterBar, { type Filter } from "./ui/FilterBar";

const copy = staffCopy.letters;

/** The letters list's filters, in the table's columns' order. */
export function letterFilters(): Filter[] {
  return [
    {
      name: "status",
      label: copy.columns.status,
      options: Object.entries(copy.status).map(([value, label]) => ({ value, label })),
    },
    {
      name: "campaign",
      label: copy.columns.campaign,
      options: campaigns.map((campaign) => ({ value: campaign.slug, label: campaign.title })),
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
export default function LetterFilters({ search }: { search: LettersSearch }) {
  return (
    <FilterBar
      path="/staff/letters"
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={letterFilters()}
    />
  );
}
