import { NextResponse } from "next/server";
import { NIGHTLY } from "@/lib/import-runs";
import { isCronRequest } from "@/lib/server/cron";
import { runSending } from "@/lib/server/sending-job";

/**
 * The hourly sending, called by netlify/functions/send-mailings and
 * send-mailings-background: a run of lib/server/sending-job.ts. Says what it
 * sent and how many letters are left: the mailings', and the queue's as
 * `queue`.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await runSending(NIGHTLY, request));
}
