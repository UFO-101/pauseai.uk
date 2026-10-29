import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestPolitician, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { GMAIL_DAILY_LIMIT } from "./gmail-accounts";
import { gmailEmail, mailingChannel, postmarkEmail } from "./mailing-channels";
import { parseMime } from "./mime";

describe("postmarkEmail", () => {
  const message = {
    from: { name: "Jo", address: "jo@pauseai.uk" },
    to: { name: "A", address: "a@b.c" },
    subject: "",
    html: "",
    text: "",
    attachments: [],
  };

  it("sends test copies, not mailings, with no limit, at no cost", async () => {
    expect(postmarkEmail.sendsMailings).toBe(false);
    expect(await postmarkEmail.remainingToday("jo@pauseai.uk")).toBeNull();
    expect(postmarkEmail.cost(message)).toBe(0);
  });

  it("reads a bounce of a message it sent as a report on it, and nothing else", () => {
    expect(postmarkEmail.report({ RecordType: "Bounce", MessageID: "m-1", Email: "a@b.c", Inactive: true })).toEqual({
      messageId: "m-1",
      kind: "bounced",
    });
    expect(postmarkEmail.report({ RecordType: "Bounce", Email: "a@b.c" })).toBeUndefined();
    expect(postmarkEmail.report({ RecordType: "Delivery", MessageID: "m-1" })).toBeUndefined();
  });
});

describeWithDatabase("gmailEmail", () => {
  useTestDatabase();
  afterEach(() => vi.unstubAllEnvs());

  it("sends a mailing's letter from the account, in the sender's name, logging it as the letter", async () => {
    await connectTestGmail();
    const politician = await addTestPolitician();
    const [{ id: letterId }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status) VALUES ('pauseai', $1, 'sending') RETURNING id::int AS id",
      [politician],
    );
    let raw = "";
    server.use(
      http.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", async ({ request }) => {
        raw = Buffer.from(((await request.json()) as { raw: string }).raw, "base64url").toString();
        return HttpResponse.json({ id: "g1", threadId: "t1" });
      }),
    );
    const result = await gmailEmail.send(
      {
        from: { name: "Jo Staff", address: "jo@pauseai.uk" },
        to: { name: "Polly", address: "polly@example.org" },
        subject: "AI",
        html: "<p>Hi</p>",
        text: "Hi",
        attachments: [],
        letterId,
      },
      "mailing",
    );
    expect(result).toMatchObject({ sent: true, id: "g1", threadId: "t1" });
    const headers = parseMime(raw).headers;
    expect([headers.get("from"), headers.get("to")]).toEqual([
      '"Jo Staff" <jo@pauseai.uk>',
      '"Polly" <polly@example.org>',
    ]);
    expect(await query("SELECT purpose, letter_id, sender FROM email_sends")).toEqual([
      { purpose: "mailing", letter_id: String(letterId), sender: "jo@pauseai.uk" },
    ]);
    // With no name of its own, in the account's.
    await gmailEmail.send({ ...MESSAGE_TO_POLLY, from: { name: "", address: "jo@pauseai.uk" } }, "mailing-test");
    expect(parseMime(raw).headers.get("from")).toBe("jo@pauseai.uk");
    expect(await query("SELECT letter_id FROM email_sends WHERE purpose = 'mailing-test'")).toEqual([
      { letter_id: null },
    ]);
  });

  it("can send up to the day's limit from an account, at no cost, and reports nothing, as bounces are read", async () => {
    expect(gmailEmail.sendsMailings).toBe(true);
    expect(await gmailEmail.remainingToday("jo@pauseai.uk")).toBe(GMAIL_DAILY_LIMIT);
    expect(gmailEmail.cost(MESSAGE_TO_POLLY)).toBe(0);
    expect(gmailEmail.report({})).toBeUndefined();
  });
});

const MESSAGE_TO_POLLY = {
  from: { name: "Jo Staff", address: "jo@pauseai.uk" },
  to: { name: "Polly", address: "polly@example.org" },
  subject: "AI",
  html: "",
  text: "Hi",
  attachments: [],
};

describe("mailingChannel", () => {
  it("sends email by Gmail, and has nothing yet for texts or WhatsApp", () => {
    expect(mailingChannel("email")).toBe(gmailEmail);
    expect(mailingChannel("text")).toBeUndefined();
    expect(mailingChannel("whatsapp")).toBeUndefined();
  });
});
