// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): each morning, asks the site to copy the MPs from
// Airtable (app/api/cron/sync-mps). Scheduled functions run only on
// published production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function syncMps(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/sync-mps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/sync-mps returned ${res.status}: ${body}`);
  return new Response(body);
}

// 06:21 UTC, just after the day's first Luma (06:17) and members (06:19)
// imports, sharing their wake of the database rather than waking it overnight
// (import-luma.ts).
export const config = { schedule: "21 6 * * *" };
