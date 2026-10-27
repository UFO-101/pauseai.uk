import type { NextRequest } from "next/server";
import { letterFilters } from "../../_components/LetterFilters";
import { letterColumns } from "../../_components/LettersTable";
import { filterWords } from "../../_components/ui/FilterBar";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentLetters } from "@/lib/server/letters";
import { staffDownload } from "@/lib/server/staff-download";
import { lettersSearch } from "@/lib/staff-search";

/**
 * Every letter the list's filters find, in the list's columns, named for
 * its filters; each download goes in the audit log, as its senders are
 * supporters.
 */
export async function GET(request: NextRequest) {
  return staffDownload(
    request,
    "supporters",
    async (params) => {
      const {
        filter: { page, ...filter },
        ...search
      } = lettersSearch(params);
      void page;
      return {
        what: staffCopy.letters.title,
        filters: filterWords(letterFilters(), search, "q"),
        columns: letterColumns,
        rows: await recentLetters({ ...filter, limit: null }),
      };
    },
    "download letters",
  );
}
