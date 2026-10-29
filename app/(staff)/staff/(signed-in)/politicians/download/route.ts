import type { NextRequest } from "next/server";
import { politicianWords } from "../../../_components/PoliticianFilters";
import { politicianColumns, politicianContact } from "../../../_components/PoliticianTable";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import { listParties, listPoliticians, politiciansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";

/** Every politician the list's filters find, in the columns the list shows, named for its house and filters. */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  return staffDownload(request, email, async (params) => {
    const { filter, ...search } = politiciansSearch(params);
    const [politicians, asks, parties] = await Promise.all([
      listPoliticians({ ...filter, page: 1 }, null),
      listAsks(),
      listParties(),
    ]);
    const filters = { ...search, page: "" };
    return {
      what: staffCopy.politicians.title,
      filters: politicianWords(search, parties, asks),
      columns: politicianColumns(asks, filters),
      rows: politicians,
      contact: politicianContact(asks),
    };
  });
}
