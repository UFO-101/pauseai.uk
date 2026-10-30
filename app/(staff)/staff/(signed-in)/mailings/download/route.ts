import type { NextRequest } from "next/server";
import { mailingColumns } from "@/lib/mailing-columns";
import { staffCopy } from "@/lib/content/staff-interface";
import { listMailings } from "@/lib/server/mailings";
import { requireStaff } from "@/lib/server/staff-auth";
import { staffDownload } from "@/lib/server/staff-download";

/** Every mailing, in the list's columns. */
export async function GET(request: NextRequest) {
  const { email } = await requireStaff();
  return staffDownload(request, email, async () => ({
    what: staffCopy.mailings.title,
    filters: [],
    columns: mailingColumns,
    rows: await listMailings(),
  }));
}
