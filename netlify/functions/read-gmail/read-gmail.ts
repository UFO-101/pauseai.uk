// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): hourly, asks the site to read the
// connected Gmail accounts for replies to our letters and for bounces
// (app/api/cron/read-gmail). Scheduled functions run only on published
// production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function readGmail(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/read-gmail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/read-gmail returned ${res.status}: ${body}`);
  return new Response(body);
}

// Every hour from 06:20 to 23:20 UTC, sharing the Luma import's wake of the
// database (import-luma.ts).
export const config = { schedule: "20 6-23 * * *" };
