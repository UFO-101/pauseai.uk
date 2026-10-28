import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { tidyLogs } from "@/lib/server/log-retention";

/** The daily tidying of the import log and the audit log, called by netlify/functions/tidy-logs. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await tidyLogs());
}
