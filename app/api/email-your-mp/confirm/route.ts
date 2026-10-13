import { NextResponse } from "next/server";
import { copy } from "@/lib/content/email-your-mp";
import { confirmLetter } from "@/lib/server/mp-letters";

/**
 * Sends a letter, given the token from its confirmation link. A POST from
 * the confirm page's script, so a link scanner that only follows the link
 * sends nothing.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await confirmLetter(typeof body?.token === "string" ? body.token : "");
  if (result.ok) return NextResponse.json({ ok: true, message: copy.confirm.sent(result.mpName) });
  return NextResponse.json({ ok: false, message: result.reason === "invalid" ? copy.confirm.invalid : copy.confirm.failed }, { status: result.reason === "invalid" ? 404 : 500 });
}
