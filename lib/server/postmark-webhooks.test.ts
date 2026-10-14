import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { forwardReply, isPostmark, recordDeliveryProblem } from "./postmark-webhooks";

const POSTMARK = "https://api.postmarkapp.com/email";
const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;
const withAuth = (authorization?: string) => new Request("https://pauseai.uk/api/postmark/bounce", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  vi.stubEnv("POSTMARK_WEBHOOK_USER", "postmark");
  vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "hunter2");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("REPLIES_INBOX", "replies@pauseai.uk");
  vi.stubEnv("MP_MAIL_DOMAIN", "mp.pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

describe("isPostmark", () => {
  it("accepts only our username and password", () => {
    expect(isPostmark(withAuth(basic("postmark:hunter2")))).toBe(true);
    expect(isPostmark(withAuth(basic("postmark:hunter3")))).toBe(false);
    expect(isPostmark(withAuth(basic("postmark:hunter")))).toBe(false);
    expect(isPostmark(withAuth())).toBe(false);
  });

  it("accepts nothing until the credentials are set", () => {
    vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "");
    expect(isPostmark(withAuth(basic("postmark:")))).toBe(false);
  });
});

/** A sent letter to the test MP. Returns its reply hash. */
async function sentLetter(messageId = "msg-1"): Promise<string> {
  const mp = await addTestMp();
  const [{ reply_hash }] = await query<{ reply_hash: string }>(
    `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent,
       subject, body, reply_hash, status, postmark_message_id)
     VALUES ('regulate-pm-letter', $1, 'Jane Smith', 'Jane@Example.com', '1 High St', 'ZZ9 9ZZ', true, 'S', 'B', 'hash1', 'sent', $2)
     RETURNING reply_hash`,
    [mp, messageId],
  );
  return reply_hash;
}

describeWithDatabase("recordDeliveryProblem", () => {
  useTestDatabase();

  it("marks a letter bounced, with Postmark's reason", async () => {
    await sentLetter();
    expect(await recordDeliveryProblem({ RecordType: "Bounce", MessageID: "msg-1", Type: "HardBounce", Description: "Unknown user", Email: "test-mp@example.org" })).toBe(true);
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "bounced" }]);
    expect(await query("SELECT status, details FROM letter_events")).toEqual([
      { status: "bounced", details: { type: "HardBounce", description: "Unknown user", email: "test-mp@example.org" } },
    ]);
  });

  it("marks a spam complaint", async () => {
    await sentLetter();
    expect(await recordDeliveryProblem({ RecordType: "SpamComplaint", MessageID: "msg-1" })).toBe(true);
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "spam_complaint" }]);
  });

  it("ignores other records, and messages that aren't letters", async () => {
    await sentLetter();
    expect(await recordDeliveryProblem({ RecordType: "Delivery", MessageID: "msg-1" })).toBe(false);
    expect(await recordDeliveryProblem({ RecordType: "Bounce" })).toBe(false);
    expect(await recordDeliveryProblem({})).toBe(false);
    expect(await recordDeliveryProblem({ RecordType: "Bounce", MessageID: "a-confirmation-email" })).toBe(false);
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "sent" }]);
  });
});

describeWithDatabase("forwardReply", () => {
  useTestDatabase();

  type Sent = { From: string; To: string; ReplyTo: string; Subject: string; TextBody: string; Attachments?: unknown[] };
  function postmark() {
    const sent: Sent[] = [];
    server.use(
      http.post(POSTMARK, async ({ request }) => {
        sent.push((await request.json()) as Sent);
        return HttpResponse.json({ ErrorCode: 0, MessageID: "fwd" });
      }),
    );
    return sent;
  }

  const reply = (hash: string, extra = {}) => ({
    MailboxHash: hash,
    FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
    ToFull: [{ Email: `reply+${hash}@mp.pauseai.uk` }],
    CcFull: [],
    Subject: "Re: S",
    Date: "Mon, 12 Oct 2026 10:00:00 +0100",
    TextBody: "Thanks for your letter.",
    ...extra,
  });

  it("forwards the reply to our inbox and to the sender, and stores nothing", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    const before = await query("SELECT * FROM letters");

    expect(await forwardReply(reply(hash, { Attachments: [{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf", ContentLength: 1 }] }))).toEqual([
      "replies@pauseai.uk",
      "Jane@Example.com",
    ]);

    expect(sent.map((e) => e.To)).toEqual(["replies@pauseai.uk", "Jane@Example.com"]);
    expect(sent[0]).toMatchObject({ From: "PauseAI UK <replies@mp.pauseai.uk>", ReplyTo: "test-mp@example.org", Subject: copy.forwardedReply.subject("Re: S") });
    expect(sent[0].TextBody).toContain(copy.forwardedReply.note("Testy McTestface MP", "Jane Smith"));
    expect(sent[0].TextBody).toContain("From: Testy McTestface MP <test-mp@example.org>");
    expect(sent[0].TextBody).toContain("Thanks for your letter.");
    expect(sent[0].Attachments).toEqual([{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf" }]);
    expect(await query("SELECT * FROM letters")).toEqual(before);
    expect(await query("SELECT * FROM letter_events")).toEqual([]);
  });

  it("doesn't send the sender a copy they already have", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(hash, { CcFull: [{ Email: "jane@example.com" }] }))).toEqual(["replies@pauseai.uk"]);
    expect(sent).toHaveLength(1);
  });

  it("copes without a shared inbox, or with a reply missing its details", async () => {
    vi.stubEnv("REPLIES_INBOX", "");
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply({ MailboxHash: hash })).toEqual(["Jane@Example.com"]);
    expect(sent[0].Subject).toBe(copy.forwardedReply.subject(""));
  });

  it("ignores mail for no letter, unknown letters, and our own mail coming back", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(""))).toEqual([]);
    expect(await forwardReply(reply("nope"))).toEqual([]);
    expect(await forwardReply(reply(hash, { FromFull: { Email: "replies@MP.pauseai.uk" } }))).toEqual([]);
    expect(sent).toEqual([]);
  });
});
