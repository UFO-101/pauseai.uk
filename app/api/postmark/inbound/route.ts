import { NextResponse } from "next/server";
import { forwardReply, isPostmark } from "@/lib/server/postmark-webhooks";
import { problem } from "@/lib/server/problems";
import { staffCopy } from "@/lib/content/staff-interface";
import { readJsonIfAny } from "@/lib/server/json";

/**
 * Postmark's inbound webhook: mail to a letter's own address, such as jane.smith.482913@letters.pauseai.uk. Answers
 * 200 once handled, or Postmark tries again.
 */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const payload = await readJsonIfAny(request);
  if (payload === undefined) problem(staffCopy.problems.badBody("Postmark"));
  return NextResponse.json({ forwarded: (await forwardReply(payload ?? {})).length });
}
