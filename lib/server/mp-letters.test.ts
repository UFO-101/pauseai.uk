import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { docFromMarkup } from "@/lib/letter-format";
import { query } from "./db";
import { letterAddress, mayWriteTo, parseLetterForm, submitLetter, type LetterForm } from "./mp-letters";

const POSTMARK = "https://api.postmarkapp.com/email";

const FORM: LetterForm = {
  campaign: "regulate-letter-pm",
  name: "Jane Smith",
  postcode: "zz9 9zz",
  address: "1 High Street\nTestville",
  email: "jane@example.com",
  subject: "Subject",
  // As the form drafts it: ending with the name, then the address and postcode, which the sender may edit.
  letter: docFromMarkup(
    "Dear Mr McTestface,\n\nPlease **do** sign.\n\nThanks,\n\nJane Smith\n\n1 High Street\nTestville\nZZ9 9ZZ",
  ),
  consent: true,
  nickname: "",
  turnstileToken: "token",
};

type Sent = {
  From: string;
  To: string;
  Bcc?: string;
  ReplyTo?: string;
  Subject: string;
  TextBody: string;
  HtmlBody?: string;
  MessageStream: string;
  Attachments?: { Name: string; Content: string; ContentType: string }[];
  Metadata?: Record<string, string>;
};

/** Records each email sent through Postmark, and answers with a MessageID. */
function postmark(
  answer: () => Response = () => HttpResponse.json({ ErrorCode: 0, MessageID: `msg-${Math.random()}` }),
) {
  const sent: Sent[] = [];
  server.use(
    http.post(POSTMARK, async ({ request }) => {
      sent.push((await request.json()) as Sent);
      return answer();
    }),
  );
  return sent;
}

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parseLetterForm", () => {
  it("trims strings, and treats anything else as empty", () => {
    expect(parseLetterForm({ name: " Jane ", consent: true, email: 5 })).toMatchObject({
      name: "Jane",
      email: "",
      address: "",
      consent: true,
    });
    expect(parseLetterForm(null).consent).toBe(false);
    expect(parseLetterForm({ letter: "Dear MP" }).letter).toBeUndefined();
    expect(parseLetterForm({ letter: FORM.letter }).letter).toEqual(FORM.letter);
  });
});

describe("mayWriteTo", () => {
  it("allows the test MP anywhere, and real MPs only in production", () => {
    expect(mayWriteTo({ isTest: true })).toBe(true);
    expect(mayWriteTo({ isTest: false })).toBe(false);
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    expect(mayWriteTo({ isTest: false })).toBe(true);
  });

  it("gives each letter its own address", () => {
    expect(letterAddress("abc123")).toBe("reply+abc123@letters.pauseai.uk");
    vi.stubEnv("LETTERS_MAIL_DOMAIN", "letters.example.org");
    expect(letterAddress("abc123")).toBe("reply+abc123@letters.example.org");
  });
});

describeWithDatabase("submitLetter", () => {
  useTestDatabase();
  beforeEach(async () => {
    await addTestMp();
    await addTestPolitician();
  });

  it("sends the letter from its own address, copied to us, replying to the sender and to us, with the PDFs", async () => {
    vi.stubEnv("REPLIES_INBOX", "replies@pauseai.uk");
    const sent = postmark(() => HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" }));

    expect(await submitLetter(FORM)).toEqual({ ok: true });

    const [letter] = await query<Record<string, unknown>>("SELECT * FROM letters");
    const address = `reply+${letter.reply_hash}@letters.pauseai.uk`;
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      From: `"Jane Smith via PauseAI" <${address}>`,
      To: "test-mp@example.org",
      Bcc: "replies@pauseai.uk",
      ReplyTo: `"Jane Smith" <jane@example.com>, "PauseAI Policy Team" <replies@pauseai.uk>, "PauseAI Letters" <${address}>`,
      Subject: "Subject",
      TextBody: "Dear Mr McTestface,\n\nPlease do sign.\n\nThanks,\n\nJane Smith\n\n1 High Street\nTestville\nZZ9 9ZZ",
      HtmlBody:
        "<p>Dear Mr McTestface,</p>\n<p>Please <strong>do</strong> sign.</p>\n<p>Thanks,</p>\n<p>Jane Smith</p>\n<p>1 High Street<br>Testville<br>ZZ9 9ZZ</p>",
      MessageStream: "outbound",
      Metadata: { letter: String(letter.id), campaign: "regulate-letter-pm" },
    });
    expect(sent[0].Attachments!.map((a) => a.Name)).toEqual(campaigns[0].attachments.map((a) => a.file));
    expect(
      Buffer.from(sent[0].Attachments![0].Content, "base64").equals(
        readFileSync("public/pdfs/Frontier-AI-Open-Letter.pdf"),
      ),
    ).toBe(true);
    expect(sent[0].Attachments![0].ContentType).toBe("application/pdf");
    expect(letter).toMatchObject({
      campaign: "regulate-letter-pm",
      sender_email: "jane@example.com",
      sender_postcode: "ZZ9 9ZZ",
      contact_consent: true,
      status: "sent",
      postmark_message_id: "msg-1",
    });
    expect(letter).not.toHaveProperty("body");
    expect(letter).not.toHaveProperty("body_html");
    expect(letter.sent_at).not.toBeNull();
    expect(
      (await query<{ status: string }>("SELECT status FROM letter_events ORDER BY id")).map((e) => e.status),
    ).toEqual(["sending", "sent"]);
  });

  it("leaves the shared inbox out of Reply-To and Bcc when there isn't one", async () => {
    vi.stubEnv("REPLIES_INBOX", "");
    const sent = postmark();
    await submitLetter(FORM);
    const [{ reply_hash }] = await query<{ reply_hash: string }>("SELECT reply_hash FROM letters");
    expect(sent[0].Bcc).toBeUndefined();
    expect(sent[0].ReplyTo).toBe(
      `"Jane Smith" <jane@example.com>, "PauseAI Letters" <reply+${reply_hash}@letters.pauseai.uk>`,
    );
  });

  it("sends a campaign without attachments without any", async () => {
    const sent = postmark();
    await submitLetter({ ...FORM, campaign: "support-sobel-bill" });
    expect(sent[0].Attachments).toEqual([]);
  });

  it("pretends to accept a bot's letter, and sends nothing", async () => {
    const sent = postmark();
    expect(await submitLetter({ ...FORM, nickname: "bot" })).toEqual({ ok: true });
    expect(sent).toEqual([]);
    expect(await query("SELECT id FROM letters")).toEqual([]);
  });

  it("refuses a letter that fails the spam check", async () => {
    expect(await submitLetter({ ...FORM, turnstileToken: "" })).toEqual({
      ok: false,
      status: 403,
      message: copy.errors.spamWait,
    });
  });

  it("refuses missing fields, a bad email, and an unknown campaign", async () => {
    expect(await submitLetter({ ...FORM, address: "" })).toMatchObject({
      status: 400,
      message: copy.errors.missingFields,
    });
    expect(await submitLetter({ ...FORM, letter: undefined })).toMatchObject({
      status: 400,
      message: copy.errors.missingFields,
    });
    expect(await submitLetter({ ...FORM, letter: docFromMarkup("\n- ") })).toMatchObject({
      status: 400,
      message: copy.errors.missingFields,
    });
    expect(await submitLetter({ ...FORM, email: "jane" })).toMatchObject({
      status: 400,
      message: copy.errors.invalidEmail,
    });
    expect(await submitLetter({ ...FORM, campaign: "nope" })).toMatchObject({
      status: 400,
      message: copy.errors.unknownCampaign,
    });
  });

  it("refuses a postcode with no MP, or an MP with no email", async () => {
    expect(await submitLetter({ ...FORM, postcode: "XX1 1XX" })).toMatchObject({
      status: 400,
      message: copy.errors.noRecipient,
    });
    await query("UPDATE politicians SET email = NULL WHERE is_test");
    expect(await submitLetter(FORM)).toMatchObject({ status: 400, message: copy.errors.noRecipient });
  });

  it("outside production, writes only to the test MP", async () => {
    const sent = postmark();
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" })).toMatchObject({
      status: 403,
      message: copy.errors.testMpOnly,
    });
    expect(sent).toEqual([]);
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" })).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });

  it("sends one letter per sender email per campaign, except to the test MPs", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    const sent = postmark();
    const real = { ...FORM, postcode: "SW1A 1AA" };
    expect(await submitLetter(real)).toEqual({ ok: true });
    expect(await submitLetter({ ...real, email: "JANE@example.com" })).toEqual({
      ok: false,
      status: 409,
      message: copy.errors.alreadySent,
    });
    expect(await submitLetter({ ...real, campaign: "support-sobel-bill" })).toEqual({ ok: true });
    expect(await submitLetter({ ...real, email: "sam@example.com" })).toEqual({ ok: true });
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    expect(sent).toHaveLength(5);
  });

  it("keeps nothing if Postmark refuses the letter, so the sender can try again", async () => {
    postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid email request" }, { status: 422 }));
    expect(await submitLetter(FORM)).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(await query("SELECT id FROM letters")).toEqual([]);

    postmark();
    expect(await submitLetter(FORM)).toEqual({ ok: true });
  });

  it("says it failed if the letter can't be saved", async () => {
    const sent = postmark();
    await query("DROP TABLE letter_events");
    expect(await submitLetter(FORM)).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(sent).toEqual([]);
  });
});
