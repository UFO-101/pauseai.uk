import type { NextRequest } from "next/server";
import { changeColumns } from "../../_components/ChangesTable";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentChanges } from "@/lib/server/audit";
import { PARLIAMENTARIANS_TABLE_URL } from "@/lib/server/outside-services/airtable";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";

/** The whole audit log, newest first, in its columns, the details as logged. */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff("admin");
  return staffDownload(request, email, async () => ({
    what: staffCopy.changes.title,
    filters: [],
    columns: changeColumns(PARLIAMENTARIANS_TABLE_URL),
    rows: (await recentChanges(1, null)).changes,
  }));
}
