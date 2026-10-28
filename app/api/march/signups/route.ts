// How many are going to the march, for the sign-up's count to keep up with
// while the page is open (useMarchSignups).
import { NextResponse } from "next/server";
import { getMarchSignupCount } from "@/lib/server/march-event";

/** How long a CDN may serve the answer, the same minute Luma's count is cached for. */
const MAX_AGE = 60;

/** Answers `{ count }`, null when Luma can't say. */
export async function GET() {
  return NextResponse.json(
    { count: await getMarchSignupCount() },
    { headers: { "Cache-Control": `public, s-maxage=${MAX_AGE}, stale-while-revalidate=${MAX_AGE}` } },
  );
}
