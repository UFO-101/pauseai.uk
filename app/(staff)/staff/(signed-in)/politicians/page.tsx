import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import { politiciansPageData } from "@/lib/server/mailing-pages";
import { listParties, politiciansSearch, type PoliticiansSearch } from "@/lib/server/politicians";
import { savedFiltersState } from "@/lib/server/saved-filters";
import { requireStaff } from "@/lib/server/staff-auth";
import {
  deleteMailingDraft,
  newMailing,
  pasteNames,
  pickFound,
  pickMany,
  pickPolitician,
  untickAll,
} from "../../mailing-actions";
import { deleteFilter, renameFilter, saveFilter, updateFilter } from "../../saved-filter-actions";
import PoliticianFilters, { politicianWords } from "../../_components/PoliticianFilters";
import PoliticiansList, { ChoosingHead, HouseTabs } from "../../_components/PoliticiansList";
import { filteredTitle } from "../../_components/ui/FilterBar";

type Props = { searchParams: Promise<Partial<PoliticiansSearch>> };

/** The list's title, with its house and filters. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff();
  const search = politiciansSearch((await savedFiltersState("politicians", await searchParams)).params);
  const [asks, parties] = await Promise.all([listAsks(), listParties()]);
  return { title: filteredTitle(staffCopy.politicians.title, politicianWords(search, parties, asks)) };
}

/** The politicians list; while it's choosing who a draft is for, its tick boxes, ticked tab and names pasted. */
export default async function PoliticiansPage({ searchParams }: Props) {
  await requireStaff();
  const saved = await savedFiltersState("politicians", await searchParams);
  const { search, choosing, filtersHidden, list, asks, parties, tickedHere, pasted } = await politiciansPageData(
    saved.params,
  );
  return (
    <ChoosingHead choosing={choosing} cancel={deleteMailingDraft}>
      <h1>{staffCopy.politicians.title}</h1>
      <HouseTabs search={search} choosing={choosing} />
      <PoliticianFilters
        search={search}
        asks={asks}
        parties={parties}
        hidden={filtersHidden}
        saved={{
          state: saved,
          actions: { save: saveFilter, update: updateFilter, rename: renameFilter, remove: deleteFilter },
        }}
      />
      <PoliticiansList
        list={list}
        search={search}
        asks={asks}
        newMailing={newMailing}
        choosing={choosing}
        tickedHere={tickedHere}
        pasted={pasted.lines}
        skipped={pasted.skipped}
        actions={{ pick: pickPolitician, pickFound, pickMany, paste: pasteNames, untickAll }}
      />
    </ChoosingHead>
  );
}
