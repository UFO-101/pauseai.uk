// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): hourly, asks the site to copy PauseAI's
// UK members (app/api/cron/import-members). Scheduled functions run only on
// published production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function importMembers(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/import-members`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/import-members returned ${res.status}: ${body}`);
  return new Response(body);
}

// Every hour, two minutes after the Luma import (at most 30 seconds) starts,
// so the two never overlap but share the database's wake (import-luma.ts).
export const config = { schedule: "19 * * * *" };
