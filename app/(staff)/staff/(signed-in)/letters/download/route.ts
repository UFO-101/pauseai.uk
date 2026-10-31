import type { NextRequest } from "next/server";
import { letterFilters } from "../../../_components/LetterFilters";
import { letterDownloadColumns } from "../../../_components/LettersTable";
import { filterWords } from "../../../_components/ui/FilterBar";
import { staffCopy } from "@/lib/content/staff-interface";
import { listCampaigns } from "@/lib/server/asks";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";
import { lettersSearch } from "@/lib/staff-search";

/**
 * Every letter the list's filters find, in the list's columns, named for
 * its filters; each download goes in the audit log, as its senders are
 * supporters.
 */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff("supporters");
  return staffDownload(
    request,
    email,
    async (params) => {
      const {
        filter: { page, ...filter },
        ...search
      } = lettersSearch(params);
      void page;
      return {
        what: staffCopy.letters.title,
        filters: filterWords(letterFilters(await listCampaigns()), search, "q"),
        columns: letterDownloadColumns,
        rows: await recentLetters({ ...filter, limit: null }),
      };
    },
    "download letters",
  );
}
