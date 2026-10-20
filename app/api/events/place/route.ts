import { NextResponse } from "next/server";
import { homeEventsCopy } from "@/lib/content/home-events";
import { placeForPostcode } from "@/lib/server/outside-services/postcodes";

const MESSAGES = { not_found: homeEventsCopy.postcodeNotFound, failed: homeEventsCopy.postcodeFailed };

/** Where a postcode, or an outcode, is, and its district's name: for the home page's events near it. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const postcode = typeof body?.postcode === "string" ? body.postcode.trim() : "";
  if (!postcode) return NextResponse.json({ ok: false, message: homeEventsCopy.postcodeRequired }, { status: 400 });

  const found = await placeForPostcode(postcode);
  if (!found.ok) return NextResponse.json({ ok: false, message: MESSAGES[found.reason] });
  return NextResponse.json({ ok: true, place: found.place, name: found.name });
}
