import type { NextRequest } from "next/server";
import { askColumns } from "../../_components/AsksTable";
import { staffCopy } from "@/lib/content/staff-interface";
import { asksWithCounts } from "@/lib/server/asks";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";

/** Every ask, with its counts of answers, in the list's columns. */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  return staffDownload(request, email, async () => ({
    what: staffCopy.asks.title,
    filters: [],
    columns: askColumns,
    rows: await asksWithCounts(),
  }));
}
