// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): nightly, asks the site to copy the
// signatories of ControlAI's letter to the PM into the bill's statuses
// (app/api/cron/import-controlai). Scheduled functions run only on
// published production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function importControlAi(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/import-controlai`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/import-controlai returned ${res.status}: ${body}`);
  return new Response(body);
}

// 02:00 UTC, after the sync (midnight) and the check (01:00), so the MPs
// it matches against are that night's.
export const config = { schedule: "0 2 * * *" };
