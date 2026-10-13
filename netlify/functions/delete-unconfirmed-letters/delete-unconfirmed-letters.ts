// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): daily, asks the site to delete letters
// never confirmed (app/api/cron/delete-unconfirmed-letters). URL is set by
// Netlify; CRON_SECRET by us.
export default async function deleteUnconfirmedLetters(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/delete-unconfirmed-letters`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/delete-unconfirmed-letters returned ${res.status}: ${body}`);
  return new Response(body);
}

export const config = { schedule: "@daily" };
