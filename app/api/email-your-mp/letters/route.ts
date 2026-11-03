import { NextResponse } from "next/server";
import { parseLetterForm, submitLetter } from "@/lib/server/mp-letters";

/** A letter from the Email your MP form, sent to the MP straight away, or queued, saying why. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await submitLetter(parseLetterForm(body));
  if (result.ok) return NextResponse.json(result);
  return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
}
