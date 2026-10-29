/** What a call to /api/cron/send-mailings did, and how many letters are left. */
export type SendingRun = { sent: number; skipped: number; failed: number; left: number };

/**
 * Whether calling again would send more: letters are left, and this call
 * got through some, so not every account sending them is at its limit.
 */
export function moreToSend(run: SendingRun): boolean {
  return run.left > 0 && run.sent + run.skipped + run.failed > 0;
}
