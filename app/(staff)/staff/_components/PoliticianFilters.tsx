import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { COUNTRIES, EMAIL_STATES, POLITICIAN_FLAGS } from "@/lib/politician-filters";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import { WINDOW_OPTIONS } from "@/lib/staff-dashboard";
import { firstOf, type Params } from "@/lib/staff-search";
import type { SavedFiltersState } from "@/lib/server/saved-filters";
import FilterBar, { filteredName, filterWords, type Filter } from "./ui/FilterBar";
import { savedFiltersProps, type SavedFilterActions } from "./ui/SavedFilters";

const copy = staffCopy.politicians;

/**
 * The politicians list's filters, among `parties` and `asks`, with the
 * answers of the ask chosen, `askSlug`: the table's
 * columns in its order, with the nation after the party and whether we can
 * email them after the status. Status is those in
 * office unless another is chosen. An answer is offered once there's an
 * ask, from those its kind allows, and goes with it. Party, nation, email,
 * the markers and the asks they've been mailed about can each be chosen
 * more than once; Except on the last finds those not yet mailed about it.
 */
export function politicianFilters(askSlug: string, parties: string[], asks: Ask[]): Filter[] {
  const ask = asks.find((a) => a.slug === askSlug);
  return [
    {
      name: "nation",
      label: staffCopy.politician.country,
      repeat: true,
      options: COUNTRIES.map((country) => ({ value: country, label: staffCopy.countries[country] })),
    },
    {
      name: "party",
      label: staffCopy.fields.party,
      repeat: true,
      options: parties.map((party) => ({ value: party, label: party })),
    },
    {
      name: "status",
      label: copy.status,
      options: [
        { value: "", label: staffCopy.personStatuses.in_office },
        ...Object.entries(staffCopy.personStatuses)
          .filter(([value]) => value !== "in_office")
          .map(([value, label]) => ({ value, label })),
        { value: "any", label: copy.anyStatus },
      ],
    },
    {
      name: "email",
      label: staffCopy.fields.email,
      repeat: true,
      options: EMAIL_STATES.map((state) => ({ value: state, label: copy.emailStates[state] })),
    },
    {
      name: "flag",
      label: copy.flag,
      repeat: true,
      options: POLITICIAN_FLAGS.map((flag) => ({ value: flag, label: copy.flags[flag] })),
    },
    {
      name: "ask",
      label: copy.ask,
      options: asks.map((a) => ({ value: a.slug, label: a.title })),
    },
    { name: "agreed", label: copy.agreedIn, options: WINDOW_OPTIONS },
    {
      name: "mailed",
      label: copy.mailed,
      repeat: true,
      options: asks.map((a) => ({ value: a.slug, label: a.title })),
    },
    {
      name: "answer",
      label: ask?.title ?? copy.answer,
      after: "ask",
      options: [
        { value: "", label: copy.anyAnswer },
        // With no ask, as a link from the dashboard can have it, any ask's answers.
        ...(ask ? ASK_STATUSES[ask.kind] : [...new Set(Object.values(ASK_STATUSES).flat())]).map((value) => ({
          value,
          label: staffCopy.statuses[value],
        })),
        { value: "none", label: copy.noAnswer },
      ],
    },
  ];
}

/** The list's house, search and filters that are on in `values`, its URL's parameters, in words. */
function wordsOf(values: Params, parties: string[], asks: Ask[]): string[] {
  return [
    staffCopy.houses[firstOf(values.house) as keyof typeof staffCopy.houses] ?? "",
    ...filterWords(politicianFilters(firstOf(values.ask), parties, asks), values, "q"),
  ];
}

/** The politicians list's house, search and filters that are on, in words, as its tabs and chips say them. */
export function politicianWords(search: PoliticiansSearch, parties: string[], asks: Ask[]): string[] {
  return wordsOf(search, parties, asks);
}

/**
 * Search and filter the politicians list: the search, then its filters. The
 * house is the tabs over the list, which Clear filters keeps. `hidden` on a
 * view the filters don't choose, such as the tab of those ticked. `saved` is
 * its saved filters, each said in the same words.
 */
export default function PoliticianFilters({
  search,
  parties,
  asks,
  hidden = false,
  saved,
}: {
  search: PoliticiansSearch;
  parties: string[];
  asks: Ask[];
  hidden?: boolean;
  saved?: { state: SavedFiltersState; actions: SavedFilterActions };
}) {
  if (hidden) return null;
  return (
    <FilterBar
      path="/staff/politicians"
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={politicianFilters(search.ask, parties, asks)}
      keep={["house"]}
      saved={
        saved &&
        savedFiltersProps({
          ...saved,
          list: "politicians",
          values: search,
          path: "/staff/politicians",
          name: filteredName(copy.title, politicianWords(search, parties, asks)),
          summary: (params) => wordsOf(params, parties, asks),
        })
      }
    />
  );
}
