import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansSearch } from "@/lib/server/politicians";
import FilterBar, { type Filter } from "./ui/FilterBar";

const copy = staffCopy.politicians;

/**
 * Search and filter the politicians list, among `parties` and `asks`: the
 * search, then the table's columns in its order, then Airtable's markers.
 * Status is those in office unless another is chosen. An answer is offered
 * once there's an ask, from those its kind allows, and goes with it. The
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
  const ask = asks.find((a) => a.slug === search.ask);
  const filters: Filter[] = [
    {
      name: "party",
      label: staffCopy.fields.party,
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
    {
      name: "flag",
      label: copy.flag,
      options: Object.entries(copy.flags).map(([value, label]) => ({ value, label })),
    },
  ];
  return (
    <FilterBar
      path="/staff/politicians"
      values={search}
      search={{ name: "q", label: copy.search }}
      filters={filters}
      keep={["house"]}
    />
  );
}
