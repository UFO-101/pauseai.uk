// Netlify background function (its name ends -background): started by the
// import-old-letters function every 5 minutes, it asks the site to do a run of
// the import of old letters (app/api/cron/import-old-letters). It answers 202 at
// once, whoever calls it, so it does nothing for a call without CRON_SECRET.
// Netlify tries it twice more, a minute and then two minutes apart, if it fails;
// a run started while another is going stops at once.
export default async function importOldLettersBackground(request: Request): Promise<void> {
  const secret = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== secret) return;
  const res = await fetch(`${process.env.URL}/api/cron/import-old-letters`, {
    method: "POST",
    headers: { Authorization: secret },
  });
  if (!res.ok) throw new Error(`/api/cron/import-old-letters returned ${res.status}: ${await res.text()}`);
}
