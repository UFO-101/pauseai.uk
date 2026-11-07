import type { NextRequest } from "next/server";
import { changeWords } from "../../../_components/ChangesFilters";
import { changeColumns } from "../../../_components/ChangesTable";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";
import { changesSearch } from "@/lib/staff-search";

/** What the log's filters find, as much of it as this staff member may see, in the order chosen and its columns, the details as logged, named for its filters. */
export async function GET(request: NextRequest) {
  const { email, permissions } = await requireStaff("admin");
  return staffDownload(request, email, async (params) => {
    const { filter, ...search } = changesSearch(params);
    return {
      what: staffCopy.changes.title,
      filters: changeWords(search),
      columns: changeColumns(PARLIAMENTARIANS_TABLE_URL),
      rows: (await recentChanges(permissions.includes("supporters"), { ...filter, page: 1 }, null)).changes,
    };
  });
}
