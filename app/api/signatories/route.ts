import { NextResponse } from "next/server";
import { AirtableRequestError, fetchFrontierLetterSignatories } from "@/lib/airtable";

export async function GET() {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }

  try {
    const signatories = await fetchFrontierLetterSignatories(token);
    return NextResponse.json(signatories, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    if (err instanceof AirtableRequestError) {
      return NextResponse.json({ error: "Airtable request failed" }, { status: 502 });
    }
    throw err;
  }
}
