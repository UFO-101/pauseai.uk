import "server-only";
import type { SendingResult } from "@/lib/import-runs";
import { keepingFailure, recordRun } from "./import-runs";
import { sendLetterQueue } from "./letter-sending";
import { sendDueLetters, startDueMailings } from "./mailing-sending";

const JOB = "send-mailings";

/**
 * How long one run sends for: well inside the time Netlify gives a
 * function, so a slow last send still finishes. The background function
 * (netlify/functions/send-mailings-background) runs it again until it's done.
 */
const SENDING_MS = 8_000;

/**
 * One run of the sending, kept in the import log: the letters inbox's queue
 * (letter-sending.ts), then the mailings due and their letters
 * (mailing-sending.ts), for a few seconds in all. `request` is the job's
 * call, for links in alerts; a staff member's run has none.
 */
export function runSending(startedBy: string, request?: Request): Promise<SendingResult> {
  return keepingFailure(JOB, startedBy, async () => {
    const until = Date.now() + SENDING_MS;
    const queue = await sendLetterQueue(until, request);
    const started = await startDueMailings();
    const result: SendingResult = { started, ...(await sendDueLetters({ until })), queue };
    const anything = started.length + result.sent + result.failed + queue.sent > 0;
    await recordRun(JOB, startedBy, anything ? "ok" : "unchanged", result);
    return result;
  });
}
