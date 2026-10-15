import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { forwardReply, isAutoReply, isPostmark, recordDeliveryProblem } from "./postmark-webhooks";

const POSTMARK = "https://api.postmarkapp.com/email";
const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;
const withAuth = (authorization?: string) => new Request("https://pauseai.uk/api/postmark/bounce", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  vi.stubEnv("POSTMARK_WEBHOOK_USER", "postmark");
  vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "hunter2");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("REPLIES_INBOX", "replies@pauseai.uk");
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
       subject, reply_hash, status, postmark_message_id)
     VALUES ('regulate-letter-pm', $1, 'Jane Smith', 'Jane@Example.com', '1 High St', 'ZZ9 9ZZ', true, 'S', 'hash1', 'sent', $2)
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
    MessageID: "inbound-1",
    MailboxHash: hash,
    FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
    ToFull: [{ Email: `reply+${hash}@letters.pauseai.uk` }],
    CcFull: [],
    Subject: "Re: S",
    Date: "Mon, 12 Oct 2026 10:00:00 +0100",
    TextBody: "Thanks for your letter.",
    ...extra,
  });

  const events = () => query<{ status: string; details: object }>("SELECT status, details FROM letter_events ORDER BY id");
  const repliedAt = async () => (await query<{ replied_at: Date | null }>("SELECT replied_at FROM letters"))[0].replied_at;

  it("forwards the reply to our inbox and to the sender, and records when it came and who from, not its text", async () => {
    const hash = await sentLetter();
    const sent = postmark();

    expect(await forwardReply(reply(hash, { Attachments: [{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf", ContentLength: 1 }] }))).toEqual([
      "replies@pauseai.uk",
      "Jane@Example.com",
    ]);

    expect(sent.map((e) => e.To)).toEqual(["replies@pauseai.uk", "Jane@Example.com"]);
    expect(sent[0]).toMatchObject({ From: "PauseAI UK <noreply@notify.pauseai.uk>", ReplyTo: "test-mp@example.org", Subject: copy.forwardedReply.subject("Re: S") });
    expect(sent[0].TextBody).toContain(copy.forwardedReply.note("Testy McTestface MP", "Jane Smith"));
    expect(sent[0].TextBody).toContain("From: Testy McTestface MP <test-mp@example.org>");
    expect(sent[0].TextBody).toContain("Thanks for your letter.");
    expect(sent[0].Attachments).toEqual([{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf" }]);
    expect(await events()).toEqual([{ status: "replied", details: { from: "test-mp@example.org", name: "Testy McTestface MP", messageId: "inbound-1" } }]);
    expect(await repliedAt()).not.toBeNull();
  });

  it("records each reply once, however often Postmark sends it, and keeps the first reply's time", async () => {
    const hash = await sentLetter();
    postmark();
    await forwardReply(reply(hash));
    const first = await repliedAt();
    await forwardReply(reply(hash));
    await forwardReply(reply(hash, { MessageID: "inbound-2" }));
    expect((await events()).map((e) => (e.details as { messageId: string }).messageId)).toEqual(["inbound-1", "inbound-2"]);
    expect(await repliedAt()).toEqual(first);
  });

  it("logs an office's automatic reply, and forwards it, without counting it as a reply", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(hash, { Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }] }))).toHaveLength(2);
    expect(sent).toHaveLength(2);
    expect(await events()).toEqual([{ status: "auto_reply", details: { from: "test-mp@example.org", name: "Testy McTestface MP", messageId: "inbound-1" } }]);
    expect(await repliedAt()).toBeNull();

    // Sent again by Postmark, it's still logged once; then the person's reply counts.
    await forwardReply(reply(hash, { Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }] }));
    await forwardReply(reply(hash, { MessageID: "inbound-2" }));
    expect((await events()).map((e) => e.status)).toEqual(["auto_reply", "replied"]);
    expect(await repliedAt()).not.toBeNull();
  });

  it("logs the sender writing back into the thread, without counting it as the MP's reply", async () => {
    const hash = await sentLetter();
    postmark();
    await forwardReply(reply(hash, { FromFull: { Email: "jane@example.com" } }));
    expect(await events()).toEqual([{ status: "replied", details: { from: "jane@example.com", name: "", messageId: "inbound-1" } }]);
    expect(await repliedAt()).toBeNull();
  });

  it("doesn't send the sender a copy they already have", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(hash, { CcFull: [{ Email: "jane@example.com" }] }))).toEqual(["replies@pauseai.uk"]);
    expect(sent).toHaveLength(1);
  });

  it("doesn't send our inbox a copy it already has", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(hash, { ToFull: [{ Email: "Replies@PauseAI.uk" }] }))).toEqual(["Jane@Example.com"]);
    expect(sent).toHaveLength(1);
  });

  it("copes without a shared inbox, or with a reply missing its details", async () => {
    vi.stubEnv("REPLIES_INBOX", "");
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply({ MailboxHash: hash })).toEqual(["Jane@Example.com"]);
    expect(sent[0].Subject).toBe(copy.forwardedReply.subject(""));
    expect(await events()).toEqual([{ status: "replied", details: { from: "", name: "", messageId: null } }]);
  });

  it("ignores mail for no letter, unknown letters, and our own mail coming back", async () => {
    const hash = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(""))).toEqual([]);
    expect(await forwardReply(reply("nope"))).toEqual([]);
    expect(await forwardReply(reply(hash, { FromFull: { Email: "noreply@NOTIFY.pauseai.uk" } }))).toEqual([]);
    expect(await forwardReply(reply(hash, { FromFull: { Email: "reply+x@letters.pauseai.uk" } }))).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe("isAutoReply", () => {
  const email = (headers: Record<string, string>, Subject = "Re: Your letter") => ({ Subject, Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })) });

  it("knows a machine's reply by its headers", () => {
    for (const headers of <Record<string, string>[]>[{ "Auto-Submitted": "auto-replied" }, { "auto-submitted": " Auto-Generated " }, { "X-Autoreply": "yes" }, { "X-Autorespond": "" }, { Precedence: "auto_reply" }, { Precedence: "bulk" }, { Precedence: "junk" }]) {
      expect(isAutoReply(email(headers)), JSON.stringify(headers)).toBe(true);
    }
  });

  it("or failing those, by its subject", () => {
    for (const subject of ["Automatic reply: Request to co-sign", "Auto-Reply: x", "autoreply", "Out of Office: back Monday", "Out of the office", "AutoResponse"]) {
      expect(isAutoReply(email({}, subject)), subject).toBe(true);
    }
  });

  it("takes a person's reply as one", () => {
    expect(isAutoReply(email({ "Auto-Submitted": "no", Precedence: "first-class", "X-Mailer": "Outlook" }))).toBe(false);
    expect(isAutoReply(email({}, "Re: Out of office hours support"))).toBe(false);
    expect(isAutoReply({})).toBe(false);
    expect(isAutoReply({ Headers: [{}, { Name: "Auto-Submitted" }] })).toBe(false);
  });
});
