import { NextResponse } from "next/server";
import { handleDeliveryProblem } from "@/lib/server/delivery-problems";
import { deliveryProblem, isPostmark } from "@/lib/server/postmark-webhooks";

/** Postmark's bounce and spam complaint webhook. Says whether it was a bounce or complaint it could record. */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const problem = deliveryProblem(await request.json().catch(() => ({})));
  if (problem) await handleDeliveryProblem(problem, new URL(request.url).origin);
  return NextResponse.json({ recorded: !!problem });
}
