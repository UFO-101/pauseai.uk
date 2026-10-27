import type { NextRequest } from "next/server";
import { politicianFilters } from "../../_components/PoliticianFilters";
import { politicianColumns, politicianContact } from "../../_components/PoliticianTable";
import { filterWords } from "../../_components/ui/FilterBar";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import { listParties, listPoliticians, politiciansSearch } from "@/lib/server/politicians";
import { staffDownload } from "@/lib/server/staff-download";

/** Every politician the list's filters find, in the columns the list shows, named for its house and filters. */
export async function GET(request: NextRequest) {
  return staffDownload(request, "account", async (params) => {
    const { filter, ...search } = politiciansSearch(params);
    const [politicians, asks, parties] = await Promise.all([
      listPoliticians({ ...filter, page: 1 }, null),
      listAsks(),
      listParties(),
    ]);
    const filters = { ...search, page: "" };
    return {
      what: staffCopy.politicians.title,
      filters: [
        staffCopy.houses[search.house as keyof typeof staffCopy.houses] ?? "",
        ...filterWords(politicianFilters(search, parties, asks), filters, "q"),
      ],
      columns: politicianColumns(politicians, asks, filters),
      rows: politicians,
      contact: politicianContact(asks),
    };
  });
}
