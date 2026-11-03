// Netlify scheduled function (a folder, so its test can sit beside it
// without becoming a function too): hourly, asks the site to start the
// mailings that are due and send for a few seconds
// (app/api/cron/send-mailings). A scheduled function has only 30 seconds,
// so if letters are left it starts the background function, which goes on
// for up to 15 minutes. Scheduled functions run only on published
// production deploys. URL is set by Netlify; CRON_SECRET by us.
import { moreToSend } from "./more-to-send";

export default async function sendMailings(): Promise<Response> {
  const res = await fetch(`${process.env.URL}/api/cron/send-mailings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`/api/cron/send-mailings returned ${res.status}: ${body}`);
  if (moreToSend(JSON.parse(body))) {
    const background = await fetch(`${process.env.URL}/.netlify/functions/send-mailings-background`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    if (background.status !== 202) throw new Error(`send-mailings-background returned ${background.status}`);
  }
  return new Response(body);
}

// Every hour at 18 minutes past, a minute after the Luma import wakes the
// database (import-luma.ts), overnight too, for the letters inbox's queue.
// A mailing due overnight still starts at 06:18 (startDueMailings). The
// staff pages say so (SENDING in lib/staff-time.ts), so a change here is a
// change there. Netlify reads the schedule without running the code, so
// it's written out, not built from SENDING.
export const config = { schedule: "18 * * * *" };
