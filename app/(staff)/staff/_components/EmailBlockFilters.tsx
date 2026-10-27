import { staffCopy } from "@/lib/content/staff-interface";
import FilterBar from "./ui/FilterBar";

/** Which blocked addresses the page at `action` lists: those like a search, and those that bounced, or complained. */
export default function EmailBlockFilters({ q, kind, action }: { q: string; kind: string; action: string }) {
  const { columns, kinds } = staffCopy.emails;
  return (
    <FilterBar
      path={action}
      values={{ q, kind }}
      search={{ name: "q", label: columns.address }}
      filters={[
        {
          name: "kind",
          label: columns.kind,
          options: [
            { value: "hard", label: kinds.hard },
            { value: "complaint", label: kinds.complaint },
          ],
        },
      ]}
    />
  );
}
