import { NextResponse } from "next/server";
import { parseLetterForm, submitLetter } from "@/lib/server/mp-letters";

/** A letter from the Email your MP form. It's sent once the sender confirms their email. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const result = await submitLetter(parseLetterForm(body), url.origin, url.hostname);
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
}
