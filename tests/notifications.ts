// The emails to the notification inbox (lib/server/notifications.ts), as
// Postmark gets them, for the tests of what sends them.
import { http, HttpResponse } from "msw";
import { vi } from "vitest";
import { server } from "./fixtures/msw";

export const NOTIFICATIONS = "notifications@example.org";

export type Notification = { To: string; Subject: string; TextBody: string };

/**
 * Sets the notification inbox, Postmark's token and the site's address,
 * and records every email Postmark is asked to send, in order. Unstub the
 * environment after (vi.unstubAllEnvs).
 */
export function notifications(): Notification[] {
  vi.stubEnv("NOTIFICATION_INBOX", NOTIFICATIONS);
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  const sent: Notification[] = [];
  server.use(
    http.post("https://api.postmarkapp.com/email", async ({ request }) => {
      sent.push((await request.json()) as Notification);
      return HttpResponse.json({ ErrorCode: 0, MessageID: `notification-${sent.length}` });
    }),
  );
  return sent;
}
