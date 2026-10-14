// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): nightly, asks the site to copy the MPs from
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

export const config = { schedule: "@daily" };
