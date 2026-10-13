import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { webhookRequest } from "@/tests/postmark-webhooks";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_WEBHOOK_USER", "postmark");
  vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "hunter2");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("REPLIES_INBOX", "replies@pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("POST /api/postmark/inbound", () => {
  useTestDatabase();

  // Postmark's inbound webhook payload, trimmed to what we read.
  const inbound = {
    MailboxHash: "hash1",
    FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
    ToFull: [{ Email: "reply+hash1@mp.pauseai.uk", Name: "", MailboxHash: "hash1" }],
    CcFull: [],
    Subject: "Re: S",
    TextBody: "Thanks.",
  };

  it("forwards a reply to a letter, and stores nothing about it", async () => {
    const mp = await addTestMp();
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, body, reply_hash, status)
       VALUES ('letter-to-the-prime-minister', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'B', 'hash1', 'sent')`,
      [mp],
    );
    const to: string[] = [];
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        to.push(((await request.json()) as { To: string }).To);
        return HttpResponse.json({ ErrorCode: 0, MessageID: "m" });
      }),
    );
    const before = await query("SELECT * FROM letters");

    expect(await (await POST(webhookRequest("/api/postmark/inbound", inbound))).json()).toEqual({ forwarded: 2 });

    expect(to).toEqual(["replies@pauseai.uk", "jane@example.com"]);
    expect(await query("SELECT * FROM letters")).toEqual(before);
    expect(await query("SELECT * FROM letter_events")).toEqual([]);
  });

  it("answers 200 to mail for no letter, or a body that isn't JSON", async () => {
    expect(await (await POST(webhookRequest("/api/postmark/inbound", inbound))).json()).toEqual({ forwarded: 0 });
    expect((await POST(webhookRequest("/api/postmark/inbound", "not json"))).status).toBe(200);
  });

  it("refuses requests without the right credentials", async () => {
    expect((await POST(webhookRequest("/api/postmark/inbound", inbound, null))).status).toBe(401);
  });
});
