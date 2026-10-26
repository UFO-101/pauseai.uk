import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
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
  const bounce = {
    RecordType: "Bounce",
    Type: "HardBounce",
    MessageID: "msg-1",
    Description: "The server was unable to deliver your message",
    Email: "test-mp@example.org",
    Inactive: true,
    CanActivate: true,
  };

  it("records a bounce on the letter, and blocks the address", async () => {
    const mp = await addTestMp();
    const id = await addTestLetter({ politicianId: mp, senderName: "Jane", senderEmail: "jane@example.com" });
    await query(
      "INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ('letter', $1, 'test-mp@example.org', 'sent', 'msg-1')",
      [id],
    );
    const res = await POST(webhookRequest("/api/postmark/bounce", bounce));
    expect(await res.json()).toEqual({ recorded: true });
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "bounced" }]);
    expect(await query("SELECT address FROM email_blocks")).toEqual([{ address: "test-mp@example.org" }]);
  });

  it("records a bounce for an email we didn't send, and answers 200 for anything else, or a body that isn't JSON", async () => {
    expect(await (await POST(webhookRequest("/api/postmark/bounce", bounce))).json()).toEqual({ recorded: true });
    expect(await query("SELECT address FROM email_problems")).toEqual([{ address: "test-mp@example.org" }]);
    const delivery = await POST(webhookRequest("/api/postmark/bounce", { ...bounce, RecordType: "Delivery" }));
    expect(await delivery.json()).toEqual({ recorded: false });
    expect((await POST(webhookRequest("/api/postmark/bounce", "not json"))).status).toBe(200);
  });

  it("refuses requests without the right credentials", async () => {
    for (const auth of [null, `Basic ${Buffer.from("postmark:wrong").toString("base64")}`]) {
      const res = await POST(webhookRequest("/api/postmark/bounce", bounce, auth));
      expect(res.status).toBe(401);
    }
  });
});
