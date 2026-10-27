import type { NextRequest } from "next/server";
import { emailBlockFilters } from "../../../../_components/EmailBlockFilters";
import { blockColumns } from "../../../../_components/EmailBlocksTable";
import { filterWords } from "../../../../_components/ui/FilterBar";
import { staffCopy } from "@/lib/content/staff-interface";
import { listBlocks } from "@/lib/server/email";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";
import { emailsSearch } from "@/lib/staff-search";

/** Every politician's blocked address the page's filters find, in its columns, named for its filters. */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  return staffDownload(request, email, async (params) => {
    const { q, kind, filter } = emailsSearch(params);
    return {
      what: staffCopy.emails.titles.mps,
      filters: filterWords(emailBlockFilters(), { q, kind }, "q"),
      columns: blockColumns(false),
      rows: await listBlocks("politicians", filter),
    };
  });
}
