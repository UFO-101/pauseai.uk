import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { syncMps } from "@/lib/server/mp-sync";

/** The nightly copy of MPs from Parliament, called by netlify/functions/sync-mps.mts. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { status, changes } = await syncMps();
  return NextResponse.json({ status, added: changes.added.length, removed: changes.removed.length, changed: changes.changed.length });
}
