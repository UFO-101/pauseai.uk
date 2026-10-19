import { NextResponse } from "next/server";
import { forwardReply, isPostmark } from "@/lib/server/postmark-webhooks";

/**
 * Postmark's inbound webhook: mail to a letter's own address, such as jane.smith.482913@letters.pauseai.uk. Answers
 * 200 once handled, or Postmark tries again.
 */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json({ forwarded: (await forwardReply(payload)).length });
}
