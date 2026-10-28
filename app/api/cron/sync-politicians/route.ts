import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { NIGHTLY } from "@/lib/import-runs";
import { syncEmails } from "@/lib/server/emails-sync";
import { syncPoliticians } from "@/lib/server/politician-sync";

/**
 * The nightly copy of the politicians from Airtable, then of PauseAI's
 * emails to them, called by netlify/functions/sync-politicians. The emails
 * are copied even if the politicians fail, and each run is kept.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const [politicians, emails] = [await settled(syncPoliticians(NIGHTLY)), await settled(syncEmails(NIGHTLY))];
  const failed = politicians.error ?? emails.error;
  if (failed) throw failed;
  const { status, changes, renamed, statuses } = politicians.value!;
  return NextResponse.json({
    status,
    added: changes.added.length,
    removed: changes.removed.length,
    changed: changes.changed.length,
    renamed: renamed.length,
    statuses,
    emails: emails.value!.added,
  });
}

/** A promise's value, or its failure, without throwing. */
async function settled<T>(work: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  try {
    return { value: await work };
  } catch (error) {
    return { error };
  }
}
