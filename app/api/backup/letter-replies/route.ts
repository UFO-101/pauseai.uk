import { NextResponse, type NextRequest } from "next/server";
import { isBackupRequest } from "@/lib/server/cron";
import { repliesAfter } from "@/lib/server/letter-threads";

/**
 * The kept replies to our letters after the ID `after`, a page at a time,
 * for the backup Worker (backup/worker/replies.ts), which fetches each from
 * ./[id] and keeps where it got to. Read-only.
 */
export async function GET(request: NextRequest) {
  if (!isBackupRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const after = Number(request.nextUrl.searchParams.get("after")) || 0;
  return NextResponse.json({ replies: await repliesAfter(after) });
}
