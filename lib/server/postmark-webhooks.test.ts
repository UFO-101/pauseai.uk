import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { recordProblem } from "./email";
import { forwardReply, isAutoReply, isPostmark, deliveryProblem } from "./postmark-webhooks";

const POSTMARK = "https://api.postmarkapp.com/email";
const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString("base64")}`;
const withAuth = (authorization?: string) =>
  new Request("https://pauseai.uk/api/postmark/bounce", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  vi.stubEnv("POSTMARK_WEBHOOK_USER", "postmark");
  vi.stubEnv("POSTMARK_WEBHOOK_PASSWORD", "hunter2");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("REPLIES_INBOX", "replies@pauseai.uk");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

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

/** A sent letter to the test MP. Returns its mailbox: its address, but for the domain. */
async function sentLetter(mailbox = "jane.smith.482913"): Promise<string> {
  const mp = await addTestMp();
  await addTestLetter({
    politicianId: mp,
    senderName: "Jane Smith",
    senderEmail: "Jane@Example.com",
    contactConsent: true,
    replyHash: mailbox,
  });
  return mailbox;
}

describe("deliveryProblem", () => {
  it("is a hard bounce when Postmark suppressed the address, with its reason, and whether it can be reset", () => {
    expect(
      deliveryProblem({
        RecordType: "Bounce",
        MessageID: "msg-1",
        Type: "HardBounce",
        Description: "Unknown user",
        Email: "Test-MP@example.org",
        Inactive: true,
        CanActivate: true,
      }),
    ).toEqual({
      address: "Test-MP@example.org",
      messageId: "msg-1",
      kind: "hard",
      reason: "Unknown user",
      canReset: true,
      details: { type: "HardBounce" },
    });
  });

  it("is a soft bounce when Postmark didn't suppress the address", () => {
    expect(deliveryProblem({ RecordType: "Bounce", Type: "SoftBounce", Email: "a@example.org" })).toEqual({
      address: "a@example.org",
      messageId: null,
      kind: "soft",
      reason: "",
      canReset: false,
      details: { type: "SoftBounce" },
    });
  });

  it("is a complaint for a spam complaint", () => {
    expect(deliveryProblem({ RecordType: "SpamComplaint", MessageID: "m", Email: "a@example.org" })).toMatchObject({
      kind: "complaint",
    });
  });

  it("is nothing for other records, or one with no address", () => {
    expect(deliveryProblem({ RecordType: "Delivery", Email: "a@example.org" })).toBeUndefined();
    expect(deliveryProblem({ RecordType: "Bounce", MessageID: "msg-1" })).toBeUndefined();
    expect(deliveryProblem({})).toBeUndefined();
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
        return HttpResponse.json({ ErrorCode: 0, MessageID: `fwd-${sent.length}` });
      }),
    );
    return sent;
  }

  const reply = (mailbox: string, extra = {}) => ({
    MessageID: "inbound-1",
    FromFull: { Email: "test-mp@example.org", Name: "Testy McTestface MP" },
    ToFull: [{ Email: `${mailbox}@letters.pauseai.uk` }],
    CcFull: [],
    Subject: "Re: S",
    Date: "Mon, 12 Oct 2026 10:00:00 +0100",
    TextBody: "Thanks for your letter.",
    ...extra,
  });

  const events = () =>
    query<{ status: string; details: object }>("SELECT status, details FROM letter_events ORDER BY id");
  const repliedAt = async () =>
    (await query<{ replied_at: Date | null }>("SELECT replied_at FROM letters"))[0].replied_at;

  it("forwards the reply to our inbox and to the sender, and records when it came and who from, not its text", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();

    expect(
      await forwardReply(
        reply(mailbox, {
          Attachments: [{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf", ContentLength: 1 }],
        }),
      ),
    ).toEqual(["replies@pauseai.uk", "Jane@Example.com"]);

    expect(sent.map((e) => e.To)).toEqual(["replies@pauseai.uk", "Jane@Example.com"]);
    expect(sent[0]).toMatchObject({
      From: "PauseAI UK <noreply@notify.pauseai.uk>",
      ReplyTo: "test-mp@example.org",
      Subject: copy.forwardedReply.subject("Re: S"),
    });
    expect(sent[0].TextBody).toContain(copy.forwardedReply.note("Testy McTestface MP", "Jane Smith"));
    expect(sent[0].TextBody).toContain("From: Testy McTestface MP <test-mp@example.org>");
    expect(sent[0].TextBody).toContain("Thanks for your letter.");
    expect(sent[0].Attachments).toEqual([{ Name: "a.pdf", Content: "QQ==", ContentType: "application/pdf" }]);
    expect(await events()).toEqual([
      {
        status: "replied",
        details: { from: "test-mp@example.org", name: "Testy McTestface MP", messageId: "inbound-1" },
      },
    ]);
    expect(await repliedAt()).not.toBeNull();
  });

  it("records each reply once, however often Postmark sends it, and keeps the first reply's time", async () => {
    const mailbox = await sentLetter();
    postmark();
    await forwardReply(reply(mailbox));
    const first = await repliedAt();
    await forwardReply(reply(mailbox));
    await forwardReply(reply(mailbox, { MessageID: "inbound-2" }));
    expect((await events()).map((e) => (e.details as { messageId: string }).messageId)).toEqual([
      "inbound-1",
      "inbound-2",
    ]);
    expect(await repliedAt()).toEqual(first);
  });

  it("logs an office's automatic reply, and forwards it, without counting it as a reply", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();
    expect(
      await forwardReply(reply(mailbox, { Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }] })),
    ).toHaveLength(2);
    expect(sent).toHaveLength(2);
    expect(await events()).toEqual([
      {
        status: "auto_reply",
        details: { from: "test-mp@example.org", name: "Testy McTestface MP", messageId: "inbound-1" },
      },
    ]);
    expect(await repliedAt()).toBeNull();

    // Sent again by Postmark, it's still logged once; then the person's reply counts.
    await forwardReply(reply(mailbox, { Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }] }));
    await forwardReply(reply(mailbox, { MessageID: "inbound-2" }));
    expect((await events()).map((e) => e.status)).toEqual(["auto_reply", "replied"]);
    expect(await repliedAt()).not.toBeNull();
  });

  it("logs the sender writing back into the thread, without counting it as the MP's reply", async () => {
    const mailbox = await sentLetter();
    postmark();
    await forwardReply(reply(mailbox, { FromFull: { Email: "jane@example.com" } }));
    expect(await events()).toEqual([
      { status: "replied", details: { from: "jane@example.com", name: "", messageId: "inbound-1" } },
    ]);
    expect(await repliedAt()).toBeNull();
  });

  it("doesn't send the sender a copy they already have", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply(mailbox, { CcFull: [{ Email: "jane@example.com" }] }))).toEqual([
      "replies@pauseai.uk",
    ]);
    expect(sent).toHaveLength(1);
  });

  it("doesn't send our inbox a copy it already has", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();
    expect(
      await forwardReply(
        reply(mailbox, {
          ToFull: [{ Email: "Replies@PauseAI.uk" }, { Email: `${mailbox}@letters.pauseai.uk` }],
        }),
      ),
    ).toEqual(["Jane@Example.com"]);
    expect(sent).toHaveLength(1);
  });

  it("copes without a shared inbox, or with a reply missing its details", async () => {
    vi.stubEnv("REPLIES_INBOX", "");
    const mailbox = await sentLetter();
    const sent = postmark();
    expect(await forwardReply({ OriginalRecipient: `${mailbox}@letters.pauseai.uk` })).toEqual(["Jane@Example.com"]);
    expect(sent[0].Subject).toBe(copy.forwardedReply.subject(""));
    expect(await events()).toEqual([{ status: "replied", details: { from: "", name: "", messageId: null } }]);
  });

  it("finds the letter by any of our addresses the reply went to, whatever their case", async () => {
    await sentLetter();
    const sent = postmark();
    const address = "Jane.Smith.482913@Letters.PauseAI.uk";
    expect(await forwardReply(reply("other", { ToFull: [], OriginalRecipient: address }))).toHaveLength(2);
    expect(
      await forwardReply(reply("other", { ToFull: [{ Name: "No address" }], CcFull: [{ Email: address }] })),
    ).toHaveLength(2);
    expect(await forwardReply(reply("other", { ToFull: [], BccFull: [{ Email: address }] }))).toHaveLength(2);
    expect(sent).toHaveLength(6);
  });

  it("skips a recipient whose address is blocked, and throws if a forward fails, so Postmark tries again", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();
    await recordProblem({ address: "jane@example.com", messageId: null, kind: "hard", reason: "", canReset: true });
    expect(await forwardReply(reply(mailbox))).toEqual(["replies@pauseai.uk", "Jane@Example.com"]);
    expect(sent.map((e) => e.To)).toEqual(["replies@pauseai.uk"]);

    vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post(POSTMARK, () => HttpResponse.json({ ErrorCode: 300, Message: "Invalid" }, { status: 422 })));
    await expect(forwardReply(reply(mailbox, { MessageID: "inbound-2" }))).rejects.toThrow(
      /Couldn't forward a reply to letter \d+/,
    );
  });

  it("finds an older letter by its reply+<hex> address", async () => {
    await sentLetter("3f9a0c1b2d4e5f60718293a4");
    postmark();
    expect(await forwardReply(reply("reply+3F9A0C1B2D4E5F60718293A4"))).toHaveLength(2);
    expect(await events()).toHaveLength(1);
  });

  it("takes the letter Postmark delivered the reply to, when it went to two", async () => {
    await sentLetter();
    const [{ politicianId }] = await query<{ politicianId: number }>(
      `SELECT notable_person_id::int AS "politicianId" FROM letters`,
    );
    const sam = [{ id: await addTestLetter({ politicianId, senderName: "Sam", replyHash: "sam.000001" }) }];
    postmark();
    const both = reply("jane.smith.482913", {
      OriginalRecipient: "sam.000001@letters.pauseai.uk",
      ToFull: [{ Email: "jane.smith.482913@letters.pauseai.uk" }, { Email: "sam.000001@letters.pauseai.uk" }],
    });
    expect(await forwardReply(both)).toEqual(["replies@pauseai.uk", "sam@example.com"]);
    expect(await query("SELECT letter_id::int AS id FROM letter_events WHERE status = 'replied'")).toEqual(sam);
  });

  it("ignores mail for no letter, unknown letters, and our own mail coming back", async () => {
    const mailbox = await sentLetter();
    const sent = postmark();
    expect(await forwardReply(reply("", { ToFull: [{ Email: "someone@example.org" }] }))).toEqual([]);
    expect(await forwardReply(reply(""))).toEqual([]);
    expect(await forwardReply(reply("nope"))).toEqual([]);
    expect(await forwardReply(reply(mailbox, { FromFull: { Email: "noreply@NOTIFY.pauseai.uk" } }))).toEqual([]);
    expect(await forwardReply(reply(mailbox, { FromFull: { Email: "reply+x@letters.pauseai.uk" } }))).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe("isAutoReply", () => {
  const email = (headers: Record<string, string>, Subject = "Re: Your letter") => ({
    Subject,
    Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
  });

  it("knows a machine's reply by its headers", () => {
    for (const headers of <Record<string, string>[]>[
      { "Auto-Submitted": "auto-replied" },
      { "auto-submitted": " Auto-Generated " },
      { "X-Autoreply": "yes" },
      { "X-Autorespond": "" },
      { Precedence: "auto_reply" },
      { Precedence: "bulk" },
      { Precedence: "junk" },
    ]) {
      expect(isAutoReply(email(headers)), JSON.stringify(headers)).toBe(true);
    }
  });

  it("or failing those, by its subject", () => {
    for (const subject of [
      "Automatic reply: Request to co-sign",
      "Auto-Reply: x",
      "autoreply",
      "Out of Office: back Monday",
      "Out of the office",
      "AutoResponse",
    ]) {
      expect(isAutoReply(email({}, subject)), subject).toBe(true);
    }
  });

  it("takes a person's reply as one", () => {
    expect(isAutoReply(email({ "Auto-Submitted": "no", Precedence: "first-class", "X-Mailer": "Outlook" }))).toBe(
      false,
    );
    expect(isAutoReply(email({}, "Re: Out of office hours support"))).toBe(false);
    expect(isAutoReply({})).toBe(false);
    expect(isAutoReply({ Headers: [{}, { Name: "Auto-Submitted" }] })).toBe(false);
  });
});
