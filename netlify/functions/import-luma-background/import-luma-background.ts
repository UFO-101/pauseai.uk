// Netlify background function (its name ends -background): started by the
// hourly import-luma function, it asks the site to copy the Luma calendar's
// events, guests and contacts (app/api/cron/import-luma). It answers 202 at
// once, whoever calls it, so it does nothing for a call without CRON_SECRET.
// Netlify tries it twice more, a minute and then two minutes apart, if it
// fails; a run started while another is going only records that it stopped.
export default async function importLumaBackground(request: Request): Promise<void> {
  const secret = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== secret) return;
  const res = await fetch(`${process.env.URL}/api/cron/import-luma`, {
    method: "POST",
    headers: { Authorization: secret },
  });
  if (!res.ok) throw new Error(`/api/cron/import-luma returned ${res.status}: ${await res.text()}`);
}
