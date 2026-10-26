// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): each morning, asks the site to check the MPs
// copied from Airtable against Parliament's (app/api/cron/check-mps).
// Scheduled functions run only on published production deploys. URL is set
// by Netlify; CRON_SECRET by us.
export default async function checkMps(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/check-mps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/check-mps returned ${res.status}: ${body}`);
  return new Response(body);
}

// 06:23 UTC, two minutes after the sync (06:21, at most 30 seconds), so it
// checks that day's copy, sharing the same wake of the database
// (import-luma.ts).
export const config = { schedule: "23 6 * * *" };
