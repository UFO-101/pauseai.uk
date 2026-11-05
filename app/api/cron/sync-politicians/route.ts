import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { NIGHTLY } from "@/lib/import-runs";
import { syncPoliticians } from "@/lib/server/politician-sync";

/** The nightly copy of the politicians from Airtable, called by netlify/functions/sync-politicians. */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { status, changes, renamed, statuses } = await syncPoliticians(NIGHTLY);
  return NextResponse.json({
    status,
    added: changes.added.length,
    removed: changes.removed.length,
    changed: changes.changed.length,
    renamed: renamed.length,
    statuses,
  });
}
