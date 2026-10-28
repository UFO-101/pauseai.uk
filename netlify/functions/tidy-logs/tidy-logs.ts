// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): each morning, asks the site to delete
// what the import log and the audit log no longer keep
// (app/api/cron/tidy-logs). Scheduled functions run only on published
// production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function tidyLogs(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/tidy-logs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/tidy-logs returned ${res.status}: ${body}`);
  return new Response(body);
}

// 06:27 UTC, after the day's other jobs, sharing their wake of the database
// rather than waking it overnight (import-luma.ts).
export const config = { schedule: "27 6 * * *" };
