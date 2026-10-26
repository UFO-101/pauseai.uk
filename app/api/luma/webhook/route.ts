import { NextResponse } from "next/server";
import { type LumaWebhook, recordLumaWebhook, signedByLuma } from "@/lib/server/luma-webhooks";

/**
 * Luma's webhook: someone unsubscribed from the calendar's emails, or
 * subscribed. Says whether it recorded anything, in the answer and the
 * function's log. 500 on a failure to, so Luma sends it again.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const at = signedByLuma(request, body);
  if (!at) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const webhookId = request.headers.get("webhook-id");
  if (!webhookId) return NextResponse.json({ error: "No Webhook-Id" }, { status: 400 });
  let payload: LumaWebhook;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Not JSON" }, { status: 400 });
  }
  try {
    const recorded = await recordLumaWebhook(payload, webhookId, at);
    console.info(`Luma webhook ${webhookId}, ${payload.type}: ${recorded ? "recorded" : "nothing to record"}`);
    return NextResponse.json({ recorded });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Not recorded" }, { status: 500 });
  }
}
