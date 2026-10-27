import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import { COUNTRIES, EMAIL_STATES, POLITICIAN_FLAGS } from "@/lib/politician-filters";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import FilterBar, { type Filter } from "./ui/FilterBar";

const copy = staffCopy.politicians;

/**
 * The politicians list's filters, among `parties` and `asks`: the table's
 * columns in its order, with the nation after the party and whether we can
 * email them after the status. Status is those in
 * office unless another is chosen. An answer is offered once there's an
 * ask, from those its kind allows, and goes with it. Party, nation, email
 * and the markers can each be chosen more than once.
 */
export function politicianFilters(search: PoliticiansSearch, parties: string[], asks: Ask[]): Filter[] {
  const ask = asks.find((a) => a.slug === search.ask);
  return [
    {
      name: "party",
      label: staffCopy.fields.party,
      repeat: true,
      options: parties.map((party) => ({ value: party, label: party })),
    },
    {
      name: "country",
      label: staffCopy.politician.country,
      repeat: true,
      options: COUNTRIES.map((country) => ({ value: country, label: staffCopy.countries[country] })),
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

/**
 * Search and filter the politicians list: the search, then its filters. The
 * house is the tabs over the list, which Clear filters keeps.
 */
export default function PoliticianFilters({
  search,
  parties,
  asks,
}: {
  search: PoliticiansSearch;
  parties: string[];
  asks: Ask[];
}) {
  return (
    <FilterBar
      path="/staff/politicians"
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={politicianFilters(search, parties, asks)}
      keep={["house"]}
    />
  );
}
