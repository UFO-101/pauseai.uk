import { NextResponse } from "next/server";

// Server-only: token never reaches the client. Only the three whitelisted
// fields below are ever returned, regardless of what else lives in the base
// (MP emails, internal notes, etc). Base/table IDs aren't secret — they were
// already public in the old iframe embed URL — only the token is.
const BASE_ID = "appBInVvIm6opJ1Ob";
const TABLE_ID = "tblH3ks9wqQHLpYx3";
const TOKEN = process.env.AIRTABLE_TOKEN;

const FIELDS = ["Full name or Title", "Party", "Constituency"] as const;
const FILTER_FORMULA = "{Signed Frontier AI Letter}=TRUE()";

type Signatory = {
  name: string;
  party: string;
  constituency: string;
};

export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });
  }

  const signatories: Signatory[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set("filterByFormula", FILTER_FORMULA);
    for (const field of FIELDS) params.append("fields[]", field);
    if (offset) params.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Airtable request failed" }, { status: 502 });
    }

    const data = await res.json();
    for (const record of data.records) {
      signatories.push({
        name: record.fields["Full name or Title"] ?? "",
        party: record.fields["Party"] ?? "",
        constituency: record.fields["Constituency"] ?? "",
      });
    }
    offset = data.offset;
  } while (offset);

  return NextResponse.json(signatories, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
