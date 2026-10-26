import { NextResponse } from "next/server";
import { signatories } from "@/lib/server/politicians";
import { FRONTIER_AI_LETTER_ASK } from "@/lib/asks";

/** Everyone who signed the letter to the Prime Minister, for the list on /campaigns. */
export async function GET() {
  try {
    return NextResponse.json(await signatories(FRONTIER_AI_LETTER_ASK), {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Couldn't read the signatories:", error);
    return NextResponse.json({ error: "Couldn't read the signatories" }, { status: 500 });
  }
}
