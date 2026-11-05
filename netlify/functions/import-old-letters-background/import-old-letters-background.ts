// Netlify background function (its name ends -background): started by pressing
// Import old letters on the staff page (lib/server/old-letters-start.ts). It
// asks the site (app/api/cron/import-old-letters) to do a little more again
// and again, for up to 15 minutes, as each of the site's own calls lasts only
// seconds, until nothing's left, Gmail refuses, or its time is up, where the
// next press takes over. It answers 202 at once, whoever calls it, so it does
// nothing for a call without CRON_SECRET.

/** When to stop asking, short of Netlify's 15 minutes. */
const RUN_MS = 14 * 60_000;

export default async function importOldLettersBackground(request: Request): Promise<void> {
  const secret = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== secret) return;
  const { startedBy } = (await request.json()) as { startedBy: string };
  const until = Date.now() + RUN_MS;
  let runId: number | undefined;
  while (Date.now() < until) {
    const res = await fetch(`${process.env.URL}/api/cron/import-old-letters`, {
      method: "POST",
      headers: { Authorization: secret, "Content-Type": "application/json" },
      body: JSON.stringify({ startedBy, runId }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`/api/cron/import-old-letters returned ${res.status}: ${body}`);
    const chunk = JSON.parse(body) as { runId: number; more: boolean };
    if (!chunk.more) return;
    runId = chunk.runId;
  }
}
