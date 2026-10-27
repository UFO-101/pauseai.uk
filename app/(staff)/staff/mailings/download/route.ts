import type { NextRequest } from "next/server";
import { mailingColumns } from "../../_components/MailingsTable";
import { staffCopy } from "@/lib/content/staff-interface";
import { listMailings } from "@/lib/server/mailings";
import { staffDownload } from "@/lib/server/staff-download";

/** Every mailing, in the list's columns. */
export async function GET(request: NextRequest) {
  return staffDownload(request, "account", async () => ({
    what: staffCopy.mailings.title,
    filters: [],
    columns: mailingColumns,
    rows: await listMailings(),
  }));
}
