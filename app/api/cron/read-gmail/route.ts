import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { readGmail } from "@/lib/server/gmail-reading";

/**
 * Reads the connected Gmail accounts for replies to our letters and
 * bounces, called by netlify/functions/read-gmail. Says what it found in each.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json({ accounts: await readGmail(request) });
}
