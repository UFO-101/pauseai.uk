import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { confirmLetter, deleteUnconfirmedLetters, letterAddress, mayWriteTo, parseLetterForm, submitLetter, type LetterForm } from "./mp-letters";

const POSTMARK = "https://api.postmarkapp.com/email";
const ORIGIN = "https://pauseai.uk";

const FORM: LetterForm = {
  campaign: "regulate-letter-pm",
  name: "Jane Smith",
  postcode: "zz9 9zz",
  address: "1 High Street\nTestville",
  email: "jane@example.com",
  subject: "Subject",
  letter: "Dear Mr McTestface,\n\nPlease sign.\n\nThanks,",
  consent: true,
  nickname: "",
  turnstileToken: "token",
};

type Sent = { From: string; To: string; ReplyTo?: string; Subject: string; TextBody: string; MessageStream: string; Attachments?: { Name: string; Content: string; ContentType: string }[]; Metadata?: Record<string, string> };

/** Records each email sent through Postmark, and answers with a MessageID. */
function postmark(answer: () => Response = () => HttpResponse.json({ ErrorCode: 0, MessageID: `msg-${Math.random()}` })) {
  const sent: Sent[] = [];
  server.use(
    http.post(POSTMARK, async ({ request }) => {
      sent.push((await request.json()) as Sent);
      return answer();
    }),
  );
  return sent;
}

/** The token from the confirmation link in an email. */
const tokenFrom = (email: Sent) => email.TextBody.match(/confirm#([\w-]+)/)![1];

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
  vi.stubEnv("MP_MAIL_DOMAIN", "mp.pauseai.uk");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parseLetterForm", () => {
  it("trims strings, and treats anything else as empty", () => {
    expect(parseLetterForm({ name: " Jane ", consent: true, email: 5 })).toMatchObject({ name: "Jane", email: "", address: "", consent: true });
    expect(parseLetterForm(null).consent).toBe(false);
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
    expect(letterAddress("abc123")).toBe("reply+abc123@mp.pauseai.uk");
    vi.stubEnv("MP_MAIL_DOMAIN", "");
    delete process.env.MP_MAIL_DOMAIN;
    expect(letterAddress("abc123")).toBe("reply+abc123@mp.pauseai.uk");
  });
});

describeWithDatabase("submitLetter", () => {
  useTestDatabase();
  beforeEach(async () => {
    await addTestMp();
    await addTestPolitician();
  });

  it("saves the letter unconfirmed, and emails the sender a link", async () => {
    const sent = postmark();

    expect(await submitLetter(FORM, ORIGIN, "localhost")).toEqual({ ok: true });

    const [letter] = await query<Record<string, unknown>>("SELECT * FROM letters");
    expect(letter).toMatchObject({
      campaign: "regulate-letter-pm",
      sender_email: "jane@example.com",
      sender_postcode: "ZZ9 9ZZ",
      status: "unconfirmed",
      contact_consent: true,
      body: "Dear Mr McTestface,\n\nPlease sign.\n\nThanks,\n\nJane Smith\n1 High Street\nTestville\nZZ9 9ZZ",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ From: "PauseAI UK <confirm@mp.pauseai.uk>", To: "jane@example.com", Subject: copy.confirmationEmail.subject, MessageStream: "outbound" });
    expect(sent[0].TextBody).toContain(`${ORIGIN}/campaigns-v2/confirm#`);
    // Only a hash of the token is kept.
    expect(String(letter.token_hash)).not.toContain(tokenFrom(sent[0]));
    expect(await query("SELECT status FROM letter_events")).toEqual([{ status: "unconfirmed" }]);
  });

  it("sends the confirmation from CONFIRMATION_FROM when it's set", async () => {
    vi.stubEnv("CONFIRMATION_FROM", "Someone <someone@example.org>");
    const sent = postmark();
    await submitLetter(FORM, ORIGIN, "localhost");
    expect(sent[0].From).toBe("Someone <someone@example.org>");
  });

  it("pretends to accept a bot's letter, and saves nothing", async () => {
    const sent = postmark();
    expect(await submitLetter({ ...FORM, nickname: "bot" }, ORIGIN, "localhost")).toEqual({ ok: true });
    expect(sent).toEqual([]);
    expect(await query("SELECT id FROM letters")).toEqual([]);
  });

  it("refuses a letter that fails the spam check", async () => {
    expect(await submitLetter({ ...FORM, turnstileToken: "" }, ORIGIN, "localhost")).toEqual({ ok: false, status: 403, message: copy.errors.spamWait });
  });

  it("refuses missing fields, a bad email, and an unknown campaign", async () => {
    expect(await submitLetter({ ...FORM, address: "" }, ORIGIN, "localhost")).toMatchObject({ status: 400, message: copy.errors.missingFields });
    expect(await submitLetter({ ...FORM, email: "jane" }, ORIGIN, "localhost")).toMatchObject({ status: 400, message: copy.errors.invalidEmail });
    expect(await submitLetter({ ...FORM, campaign: "nope" }, ORIGIN, "localhost")).toMatchObject({ status: 400, message: copy.errors.unknownCampaign });
  });

  it("refuses a postcode with no MP, or an MP with no email", async () => {
    expect(await submitLetter({ ...FORM, postcode: "XX1 1XX" }, ORIGIN, "localhost")).toMatchObject({ status: 400, message: copy.errors.noRecipient });
    await query("UPDATE politicians SET email = NULL WHERE is_test");
    expect(await submitLetter(FORM, ORIGIN, "localhost")).toMatchObject({ status: 400, message: copy.errors.noRecipient });
  });

  it("outside production, writes only to the test MP", async () => {
    const sent = postmark();
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" }, ORIGIN, "localhost")).toMatchObject({ status: 403, message: copy.errors.testMpOnly });
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" }, ORIGIN, "localhost")).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });

  it("sends at most 5 confirmation emails a day to one address", async () => {
    const sent = postmark();
    for (let i = 0; i < 5; i++) expect(await submitLetter({ ...FORM, email: i % 2 ? "JANE@example.com" : "jane@example.com" }, ORIGIN, "localhost")).toEqual({ ok: true });
    expect(await submitLetter(FORM, ORIGIN, "localhost")).toEqual({ ok: false, status: 429, message: copy.errors.tooManyConfirmations });
    expect(await submitLetter({ ...FORM, email: "sam@example.com" }, ORIGIN, "localhost")).toEqual({ ok: true });
    expect(sent).toHaveLength(6);

    await query("UPDATE letters SET created_at = now() - interval '25 hours'");
    expect(await submitLetter(FORM, ORIGIN, "localhost")).toEqual({ ok: true });
  });

  it("keeps nothing if the confirmation email can't be sent", async () => {
    postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid email request" }, { status: 422 }));
    expect(await submitLetter(FORM, ORIGIN, "localhost")).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(await query("SELECT id FROM letters")).toEqual([]);
  });
});

describeWithDatabase("confirmLetter", () => {
  useTestDatabase();
  beforeEach(async () => {
    await addTestMp();
  });

  async function submitted(form = FORM) {
    const sent = postmark();
    await submitLetter(form, ORIGIN, "localhost");
    return tokenFrom(sent[0]);
  }

  it("sends the letter from its own address, replying to the sender and to us, with the PDFs", async () => {
    const token = await submitted();
    const sent = postmark(() => HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" }));

    expect(await confirmLetter(token)).toEqual({ ok: true, mpName: "Testy McTestface MP" });

    const [letter] = await query<{ id: string; reply_hash: string; status: string; postmark_message_id: string; token_hash: string | null; sent_at: Date | null }>("SELECT * FROM letters");
    const address = `reply+${letter.reply_hash}@mp.pauseai.uk`;
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      From: `"Jane Smith via PauseAI" <${address}>`,
      To: "test-mp@example.org",
      ReplyTo: `jane@example.com, ${address}`,
      Subject: "Subject",
      TextBody: "Dear Mr McTestface,\n\nPlease sign.\n\nThanks,\n\nJane Smith\n1 High Street\nTestville\nZZ9 9ZZ",
      MessageStream: "outbound",
      Metadata: { letter: String(letter.id), campaign: "regulate-letter-pm" },
    });
    expect(sent[0].Attachments!.map((a) => a.Name)).toEqual(campaigns[0].attachments.map((a) => a.file));
    expect(Buffer.from(sent[0].Attachments![0].Content, "base64").equals(readFileSync("public/pdfs/Frontier-AI-Open-Letter.pdf"))).toBe(true);
    expect(sent[0].Attachments![0].ContentType).toBe("application/pdf");
    expect(letter).toMatchObject({ status: "sent", postmark_message_id: "msg-1", token_hash: null });
    expect(letter.sent_at).not.toBeNull();
    expect((await query<{ status: string }>("SELECT status FROM letter_events ORDER BY id")).map((e) => e.status)).toEqual(["unconfirmed", "sent"]);
  });

  it("works only once", async () => {
    const token = await submitted();
    postmark();
    expect((await confirmLetter(token)).ok).toBe(true);
    expect(await confirmLetter(token)).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmLetter("made-up")).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmLetter("")).toEqual({ ok: false, reason: "invalid" });
  });

  it("sends a campaign without attachments without any", async () => {
    const token = await submitted({ ...FORM, campaign: "support-sobel-bill" });
    const sent = postmark();
    await confirmLetter(token);
    expect(sent[0].Attachments).toEqual([]);
  });

  it("lets the sender try again if sending fails", async () => {
    const token = await submitted();
    postmark(() => new HttpResponse(null, { status: 500 }));
    expect(await confirmLetter(token)).toEqual({ ok: false, reason: "failed" });
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "unconfirmed" }]);

    postmark();
    expect((await confirmLetter(token)).ok).toBe(true);
  });

  it("won't send outside production to anyone but the test MP, or to an MP without an email", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    await addTestPolitician();
    const token = await submitted({ ...FORM, postcode: "SW1A 1AA" });
    vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
    const sent = postmark();
    expect(await confirmLetter(token)).toEqual({ ok: false, reason: "failed" });

    const testToken = await submitted();
    await query("UPDATE politicians SET email = NULL WHERE is_test");
    expect(await confirmLetter(testToken)).toEqual({ ok: false, reason: "failed" });
    // Only the two confirmation emails went.
    expect(sent.filter((email) => email.To !== "jane@example.com")).toEqual([]);
    expect(await query("SELECT DISTINCT status FROM letters")).toEqual([{ status: "unconfirmed" }]);
  });
});

describeWithDatabase("deleteUnconfirmedLetters", () => {
  useTestDatabase();

  it("deletes letters left unconfirmed for 7 days, and nothing else", async () => {
    await addTestMp();
    postmark();
    await submitLetter(FORM, ORIGIN, "localhost");
    await submitLetter(FORM, ORIGIN, "localhost");
    await submitLetter(FORM, ORIGIN, "localhost");
    const [{ id: sent }] = await query<{ id: number }>("UPDATE letters SET status = 'sent' WHERE id = (SELECT min(id) FROM letters) RETURNING id::int AS id");
    await query("UPDATE letters SET created_at = now() - interval '8 days' WHERE id <> (SELECT max(id) FROM letters)");

    expect(await deleteUnconfirmedLetters()).toBe(1);
    expect((await query<{ id: number }>("SELECT id::int AS id FROM letters ORDER BY id")).map((l) => l.id)).toEqual([sent, 3]);
  });
});
