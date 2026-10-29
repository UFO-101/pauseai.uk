// Netlify background function (its name ends -background): started by the
// hourly send-mailings function when a mailing has more letters than one
// call sends. It asks the site to send (app/api/cron/send-mailings) again
// and again, for up to 15 minutes, until none are left or every account
// sending has reached its limit for the day; the next hour's run takes up
// what's left. It answers 202 at once, whoever calls it, so it does nothing
// for a call without CRON_SECRET.
import { moreToSend } from "../send-mailings/more-to-send";

/** When to stop asking, short of Netlify's 15 minutes. */
const RUN_MS = 14 * 60_000;

export default async function sendMailingsBackground(request: Request): Promise<void> {
  const secret = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== secret) return;
  const until = Date.now() + RUN_MS;
  while (Date.now() < until) {
    const res = await fetch(`${process.env.URL}/api/cron/send-mailings`, {
      method: "POST",
      headers: { Authorization: secret },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`/api/cron/send-mailings returned ${res.status}: ${body}`);
    if (!moreToSend(JSON.parse(body))) return;
  }
}
