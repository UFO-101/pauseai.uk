import { NextResponse } from "next/server";
import { isPostmark, recordDeliveryProblem } from "@/lib/server/postmark-webhooks";

/** Postmark's bounce and spam complaint webhook. */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json({ recorded: await recordDeliveryProblem(payload) });
}
