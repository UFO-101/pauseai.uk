import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { deleteUnconfirmedLetters } from "@/lib/server/mp-letters";

/** Deletes letters never confirmed, after 7 days. Called daily by netlify/functions/delete-unconfirmed-letters. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json({ deleted: await deleteUnconfirmedLetters() });
}
