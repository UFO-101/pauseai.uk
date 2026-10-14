import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { webhookRequest } from "@/tests/postmark-webhooks";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_WEBHOOK_USER", "postmark");
  vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "hunter2");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("POST /api/postmark/bounce", () => {
  useTestDatabase();

  // Postmark's bounce webhook payload, trimmed to what we read.
  const bounce = { RecordType: "Bounce", Type: "HardBounce", MessageID: "msg-1", Description: "The server was unable to deliver your message", Email: "test-mp@example.org" };

  it("records a bounce on the letter", async () => {
    const mp = await addTestMp();
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, body, reply_hash, status, postmark_message_id)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'B', 'h', 'sent', 'msg-1')`,
      [mp],
    );
    const res = await POST(webhookRequest("/api/postmark/bounce", bounce));
    expect(await res.json()).toEqual({ recorded: true });
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "bounced" }]);
  });

  it("answers 200 for a message that isn't a letter, or a body that isn't JSON", async () => {
    expect(await (await POST(webhookRequest("/api/postmark/bounce", bounce))).json()).toEqual({ recorded: false });
    expect((await POST(webhookRequest("/api/postmark/bounce", "not json"))).status).toBe(200);
  });

  it("refuses requests without the right credentials", async () => {
    for (const auth of [null, `Basic ${Buffer.from("postmark:wrong").toString("base64")}`]) {
      const res = await POST(webhookRequest("/api/postmark/bounce", bounce, auth));
      expect(res.status).toBe(401);
    }
  });
});
