import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/server/cron";
import { sendLetterQueue } from "@/lib/server/letter-sending";
import { sendDueLetters, startDueMailings } from "@/lib/server/mailing-sending";

/**
 * How long one call sends for: well inside the time Netlify gives a
 * function, so a slow last send still finishes. The background function
 * (netlify/functions/send-mailings-background) calls again until it's done.
 */
const SENDING_MS = 8_000;

/**
 * Works through the letters inbox's queue (lib/server/letter-sending.ts),
 * then starts the mailings that are due and sends their letters, for a
 * few seconds in all, called by netlify/functions/send-mailings and
 * send-mailings-background. Says what it sent and how many letters are
 * left: the mailings', and the queue's as `queue`.
 */
export async function POST(request: Request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const until = Date.now() + SENDING_MS;
  const queue = await sendLetterQueue(until, request);
  const started = await startDueMailings();
  return NextResponse.json({ started, ...(await sendDueLetters({ until })), queue });
}
