import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { checkMps } from "@/lib/server/mp-check";

/** The nightly check of the MPs against Parliament's, called by netlify/functions/check-mps. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const problems = await checkMps();
  return NextResponse.json({ problems: problems.length });
}
