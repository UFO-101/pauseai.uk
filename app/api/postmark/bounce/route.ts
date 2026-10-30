import { NextResponse } from "next/server";
import { handleDeliveryProblem } from "@/lib/server/delivery-problems";
import { deliveryProblem, isPostmark, recordAutoResponder } from "@/lib/server/postmark-webhooks";

/**
 * Postmark's bounce and spam complaint webhook, which also brings the
 * automatic replies sent to our bounce address. Says whether it was one it
 * could record.
 */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  if (await recordAutoResponder(payload)) return NextResponse.json({ recorded: true });
  const problem = deliveryProblem(payload);
  if (problem) await handleDeliveryProblem(problem, request);
  return NextResponse.json({ recorded: !!problem });
}
