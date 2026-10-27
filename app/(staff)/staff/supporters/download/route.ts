import type { NextRequest } from "next/server";
import { supporterFilters } from "../../_components/SupporterFilters";
import { supporterColumns, supporterContact, supporterFiltersOf } from "../../_components/SupportersTable";
import { filterWords } from "../../_components/ui/FilterBar";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDownload } from "@/lib/server/staff-download";
import { eventChoices, listSupporters } from "@/lib/server/supporters";
import { supportersSearch } from "@/lib/staff-search";

/**
 * Every supporter the list's filters find, in the list's columns, named
 * for its filters; each download goes in the audit log.
 */
export async function GET(request: NextRequest) {
  return staffDownload(
    request,
    "supporters",
    async (params) => {
      const { filter, ...search } = supportersSearch(params);
      const [{ supporters, near }, events] = await Promise.all([
        listSupporters({ ...filter, page: 1 }, null),
        eventChoices(),
      ]);
      return {
        what: staffCopy.supporters.title,
        filters: filterWords(supporterFilters(search, events, near), supporterFiltersOf(search), "q"),
        columns: supporterColumns(search),
        rows: supporters,
        contact: supporterContact,
      };
    },
    "download supporters",
  );
}
