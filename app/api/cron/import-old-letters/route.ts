import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { importOldLettersChunk } from "@/lib/server/old-letters-import";

/**
 * One call's work on a press of the import of old letters, called again and
 * again by netlify/functions/import-old-letters-background.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { startedBy, runId } = (await request.json()) as { startedBy: string; runId?: number };
  const { runId: run, more } = await importOldLettersChunk({ startedBy, runId });
  return NextResponse.json({ runId: run, more });
}
