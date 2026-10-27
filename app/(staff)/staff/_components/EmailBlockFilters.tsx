import { staffCopy } from "@/lib/content/staff-interface";
import FilterBar, { type Filter } from "./ui/FilterBar";

/** The blocked addresses' filter: those that bounced, or complained. */
export function emailBlockFilters(): Filter[] {
  const { columns, kinds } = staffCopy.emails;
  return [
    {
      name: "kind",
      label: columns.kind,
      options: [
        { value: "hard", label: kinds.hard },
        { value: "complaint", label: kinds.complaint },
      ],
    },
  ];
}

/** Which blocked addresses the page at `action` lists: those like a search, and by its filter. */
export default function EmailBlockFilters({ q, kind, action }: { q: string; kind: string; action: string }) {
  return (
    <FilterBar
      path={action}
      values={{ q, kind }}
      search={{ name: "q", label: staffCopy.emails.columns.address }}
      filters={emailBlockFilters()}
    />
  );
}
