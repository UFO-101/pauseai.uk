import { NextResponse } from "next/server";
import { NIGHTLY } from "@/lib/import-runs";
import { isCronRequest } from "@/lib/server/cron";
import { runTidying } from "@/lib/server/log-retention";

/** The daily tidying, called by netlify/functions/tidy-logs: a run of lib/server/log-retention.ts. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await runTidying(NIGHTLY));
}
