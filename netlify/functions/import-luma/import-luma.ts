// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): hourly, asks the site to copy the Luma
// calendar's events, guests and contacts (app/api/cron/import-luma).
// Scheduled functions run only on published production deploys. URL is set
// by Netlify; CRON_SECRET by us.
export default async function importLuma(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/import-luma`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/import-luma returned ${res.status}: ${body}`);
  return new Response(body);
}

// Every hour, off the hour, so it never coincides with the nightly jobs or
// with everyone else's on-the-hour fetches of Luma.
export const config = { schedule: "17 * * * *" };
