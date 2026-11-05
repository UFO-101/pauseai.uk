// Netlify scheduled function (a folder, so its test can sit beside it without
// becoming a function too): every 5 minutes, starts the background function that
// asks the site to do a run of the import of old letters
// (import-old-letters-background). Netlify invokes a scheduled function again
// when it hasn't answered after about 15 seconds, so this answers as soon as the
// background function has started. Scheduled functions run only on published
// production deploys. URL is set by Netlify; CRON_SECRET by us.
export default async function importOldLetters(): Promise<Response> {
  const background = await fetch(`${process.env.URL}/.netlify/functions/import-old-letters-background`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  if (background.status !== 202) throw new Error(`import-old-letters-background returned ${background.status}`);
  return new Response("Started");
}

// Every 5 minutes from 3 minutes past the hour, away from the Gmail reading on
// the five, which reads the same mailboxes.
export const config = { schedule: "3-59/5 * * * *" };
