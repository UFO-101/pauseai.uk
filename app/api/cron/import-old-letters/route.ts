import { NextResponse } from "next/server";
import { NIGHTLY } from "@/lib/import-runs";
import { isCronRequest } from "@/lib/server/cron";
import { importOldLetters } from "@/lib/server/old-letters-import";

/** The import of old letters every 5 minutes, called by netlify/functions/import-old-letters-background. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await importOldLetters(NIGHTLY));
}
