// For Vitest: what the site sends by the fake Gmail, as it went, and mail
// arriving at the letters inbox (tests/fixtures/letters-inbox.ts).
import { http } from "msw";
import { vi } from "vitest";
import { parseMime, firstOfType, partText, type MimePart } from "@/lib/server/mime";
import { server } from "./fixtures/msw";
import { fixtureResponse } from "./fixtures/outside-services";

const SEND = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

/** A message the fake Gmail was sent: whose account, its headers, its text, and the whole of it. */
export type GmailSend = {
  account: string;
  headers: Map<string, string>;
  text: string;
  html: string;
  raw: string;
  mime: MimePart;
};

/**
 * Records each message sent by Gmail, and answers as the fake does, or
 * with `answer` when it gives one: a failure, say.
 */
export function recordGmail(answer?: () => Response | undefined): GmailSend[] {
  const sent: GmailSend[] = [];
  server.use(
    http.post(SEND, async ({ request }) => {
      const body = await request.text();
      const raw = Buffer.from((JSON.parse(body) as { raw: string }).raw, "base64url").toString("latin1");
      const mime = parseMime(raw);
      const text = (type: string) => {
        const part = firstOfType(mime, type);
        return part ? partText(part).replace(/\r\n/g, "\n") : "";
      };
      sent.push({
        account: request.headers.get("authorization")!.replace(/^Bearer fixture-access:/, ""),
        headers: mime.headers,
        text: text("text/plain"),
        html: text("text/html"),
        raw,
        mime,
      });
      return answer?.() ?? fixtureResponse(request.url, { method: "POST", headers: request.headers, body });
    }),
  );
  return sent;
}

export { LETTERS_INBOX, testMail, testProxy, type TestMail } from "./fixtures/test-mail";

/** The settings reading and relaying need: Netlify Blobs, answered by the fixtures, and the site's own address, for links. */
export function stubLettersInboxEnv(): void {
  vi.stubEnv(
    "NETLIFY_BLOBS_CONTEXT",
    Buffer.from(JSON.stringify({ edgeURL: "https://blobs.fixture.invalid", siteID: "fixture", token: "t" })).toString(
      "base64",
    ),
  );
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  vi.stubEnv("POLICY_INBOX", "policy@example.org");
  // Staff alerts, and unblocking, which asks Postmark to send to an address again.
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
}
