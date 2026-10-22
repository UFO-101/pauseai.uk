import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { importMembers } from "@/lib/server/members-import";
import { NIGHTLY } from "@/lib/import-runs";

/** The hourly copy of PauseAI's UK members, called by netlify/functions/import-members. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const result = await importMembers(NIGHTLY);
  return NextResponse.json(result);
}
