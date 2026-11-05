import { NextResponse } from "next/server";
import { handleDeliveryProblem } from "@/lib/server/delivery-problems";
import { deliveryProblem, isPostmark, recordAutoResponder } from "@/lib/server/postmark-webhooks";
import { readJsonIfAny } from "@/lib/server/json";
import { problem } from "@/lib/server/problems";
import { staffCopy } from "@/lib/content/staff-interface";

/**
 * Postmark's bounce and spam complaint webhook, which also brings the
 * automatic replies sent to our bounce address. Says whether it was one it
 * could record.
 */
export async function POST(request: Request) {
  if (!isPostmark(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const payload = await readJsonIfAny(request);
  if (payload === undefined) problem(staffCopy.problems.badBody("Postmark"));
  if (await recordAutoResponder(payload ?? {})) return NextResponse.json({ recorded: true });
  const found = deliveryProblem(payload ?? {});
  if (found) await handleDeliveryProblem(found, request);
  return NextResponse.json({ recorded: !!found });
}
