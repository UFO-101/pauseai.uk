import { NextResponse, type NextRequest } from "next/server";
import { isBackupRequest } from "@/lib/server/cron";
import { replyFile } from "@/lib/server/letter-threads";

/** One kept reply, the whole message gzipped as it's stored, for the backup Worker. Read-only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isBackupRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const file = await replyFile(Number((await params).id) || 0);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/gzip" } });
}
