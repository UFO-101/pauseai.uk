import { NextResponse } from "next/server";
import { importControlAiLetter } from "@/lib/server/controlai-import";
import { isCronRequest } from "@/lib/server/cron";
import { NIGHTLY } from "@/lib/import-runs";

/** The nightly copy of ControlAI's letter's signatories, called by netlify/functions/import-controlai. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const result = await importControlAiLetter(NIGHTLY);
  return NextResponse.json(result);
}
