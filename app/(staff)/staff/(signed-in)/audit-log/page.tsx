import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { changeChoices, recentChanges } from "@/lib/server/audit";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { savedFiltersIf } from "@/lib/server/saved-filters";
import { requireStaff } from "@/lib/server/staff-auth";
import { changesSearch, type ChangesSearch, type ParamValue } from "@/lib/staff-search";
import { deleteFilter, renameFilter, saveFilter, updateFilter } from "../../saved-filter-actions";
import ChangesFilters, { changeWords } from "../../_components/ChangesFilters";
import ChangesTable from "../../_components/ChangesTable";
import { filteredTitle } from "../../_components/ui/FilterBar";

type Props = { searchParams: Promise<Partial<Record<keyof ChangesSearch, ParamValue>>> };

/** The log's title, with its filters. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff("admin");
  return { title: filteredTitle(staffCopy.changes.title, changeWords(changesSearch(await searchParams))) };
}

/**
 * The log, filtered. Saved filters can name a supporter, in their name or
 * search, so only those who may see supporters get them.
 */
export default async function ChangesPage({ searchParams }: Props) {
  const { permissions } = await requireStaff("admin");
  const supporters = permissions.includes("supporters");
  const { state, params } = await savedFiltersIf(supporters, "audit-log", await searchParams);
  const { filter, ...search } = changesSearch(params);
  const [log, choices] = await Promise.all([recentChanges(supporters, filter), changeChoices(supporters)]);
  return (
    <>
      <h1>{staffCopy.changes.title}</h1>
      <ChangesFilters
        search={search}
        choices={choices}
        saved={state}
        actions={{ save: saveFilter, update: updateFilter, rename: renameFilter, remove: deleteFilter }}
      />
      <ChangesTable
        log={log}
        search={search}
        page={filter.page!}
        supporters={supporters}
        airtableTable={PARLIAMENTARIANS_TABLE_URL}
      />
    </>
  );
}
