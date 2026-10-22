import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { importLuma } from "@/lib/server/luma-import";
import { NIGHTLY } from "@/lib/import-runs";

/** The hourly copy of the Luma calendar's events, guests and contacts, called by netlify/functions/import-luma. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const result = await importLuma(NIGHTLY);
  return NextResponse.json(result);
}
