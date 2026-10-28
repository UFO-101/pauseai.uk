import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { tidyLogs } from "@/lib/server/log-retention";
import { deleteForgottenDrafts } from "@/lib/server/mailing-drafts";

/**
 * The daily tidying, called by netlify/functions/tidy-logs: the import log
 * and the audit log, and the drafts of mailings nobody wrote anything in.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json({ ...(await tidyLogs()), drafts: await deleteForgottenDrafts() });
}
