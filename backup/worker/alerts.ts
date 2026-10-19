import type { Outcome } from "./run.ts";

// Every run reports. A problem is emailed through Postmark, the service the
// site sends its own email with. If HEALTHCHECK_URL is set, every run also
// pings it (Healthchecks.io's API: the URL for a good run, /fail for a bad
// one), which emails when a ping is late, so a backup that never runs isn't
// mistaken for one that worked.

export interface AlertEnv {
  POSTMARK_SERVER_TOKEN?: string;
  ALERT_FROM?: string;
  ALERT_TO?: string;
  HEALTHCHECK_URL?: string;
}

const POSTMARK_URL = "https://api.postmarkapp.com/email";

/** Sends the outcome where it goes. Throws if it couldn't, so the run shows as failed in Cloudflare's logs. */
export async function report(outcome: Outcome, env: AlertEnv, send: typeof fetch = fetch): Promise<void> {
  const failures: string[] = [];
  const text = describe(outcome);
  const ok = outcome.problems.length === 0;

  if (env.HEALTHCHECK_URL) {
    const url = ok ? env.HEALTHCHECK_URL : `${env.HEALTHCHECK_URL}/fail`;
    const response = await send(url, { method: "POST", body: text });
    if (!response.ok) failures.push(`Healthchecks replied ${response.status}.`);
  }

  if (!ok) {
    const { POSTMARK_SERVER_TOKEN: token, ALERT_FROM: from, ALERT_TO: to } = env;
    if (!token || !from || !to) {
      const missing = Object.entries({ POSTMARK_SERVER_TOKEN: token, ALERT_FROM: from, ALERT_TO: to })
        .filter(([, value]) => !value)
        .map(([name]) => name);
      failures.push(`Can't email the problems: ${missing.join(", ")} not set.`);
    } else {
      const response = await send(POSTMARK_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify({
          From: from,
          To: to,
          Subject: "Database backup: problems",
          TextBody: text,
          MessageStream: "outbound",
        }),
      });
      if (!response.ok) failures.push(`Postmark replied ${response.status}: ${await response.text()}`);
    }
  }

  if (failures.length) throw new Error(`${failures.join(" ")}\n\n${text}`);
}

/** The run in plain text: its problems, then the manifest if there is one. */
export function describe({ manifest, problems }: Outcome): string {
  const lines = problems.length ? ["Problems:", ...problems.map((problem) => `- ${problem}`)] : ["No problems."];
  if (manifest) lines.push("", "Manifest:", JSON.stringify(manifest, null, 2));
  return lines.join("\n");
}
