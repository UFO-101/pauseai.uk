import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { docFromMarkup } from "@/lib/letter-format";
import { query } from "./db";
import { recordProblem } from "./email";
import {
  letterAddress,
  mailboxName,
  mayWriteTo,
  recipient,
  parseLetterForm,
  submitLetter,
  type LetterForm,
} from "./mp-letters";

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
  Cc?: string;
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
    expect(letterAddress("jane.smith.482913")).toBe("jane.smith.482913@letters.pauseai.uk");
    vi.stubEnv("LETTERS_MAIL_DOMAIN", "letters.example.org");
    expect(letterAddress("jane.smith.482913")).toBe("jane.smith.482913@letters.example.org");
  });
});

describe("recipient", () => {
  it("names the MP, with MP after their name once", () => {
    expect(recipient({ name: "Ms Dora Dummy" }, "dora@example.org")).toBe('"Ms Dora Dummy MP" <dora@example.org>');
    expect(recipient({ name: " Testy McTestface MP " }, "t@example.org")).toBe('"Testy McTestface MP" <t@example.org>');
    expect(recipient({ name: 'Rt Hon "Sir" Bob <Smith>' }, "b@example.org")).toBe(
      '"Rt Hon Sir Bob Smith MP" <b@example.org>',
    );
    expect(recipient({ name: "Amp" }, "a@example.org")).toBe('"Amp MP" <a@example.org>');
  });
});

describe("mailboxName", () => {
  it("spells the sender's name in lowercase ASCII words joined by dots", () => {
    expect(mailboxName("Jane Smith")).toBe("jane.smith");
    expect(mailboxName("  Zoë O’Brien-Smith ")).toBe("zoe.obrien.smith");
    expect(mailboxName("Dr. J. R. Hartley 3rd")).toBe("dr.j.r.hartley.3rd");
    expect(mailboxName("Jürgen Strauß")).toBe("jurgen.strauss");
    expect(mailboxName("Søren Łukasz")).toBe("soren.lukasz");
    expect(mailboxName("Æthelred Œuvre")).toBe("aethelred.oeuvre");
    expect(mailboxName("Đorđe Þór Iğdır")).toBe("dorde.thor.igdir");
    expect(mailboxName('Jane "<script>" Smith@evil.com')).toBe("jane.script.smith.evil.com");
  });

  it("stops at 30 characters, never on a dot", () => {
    expect(mailboxName("Alexandra Montgomery-Fitzwilliam")).toBe("alexandra.montgomery.fitzwilli");
    expect(mailboxName("Abcdefghijklmnopqrstuvwxyz ABCD Efg")).toBe("abcdefghijklmnopqrstuvwxyz.abc");
    expect(mailboxName("Abcdefghijklmnopqrstuvwxyzabc D")).toBe("abcdefghijklmnopqrstuvwxyzabc");
  });

  it("is 'letter' when none of the name is Latin script", () => {
    expect(mailboxName("王小明")).toBe("letter");
    expect(mailboxName("🙂")).toBe("letter");
    expect(mailboxName("")).toBe("letter");
  });
});

describeWithDatabase("submitLetter", () => {
  useTestDatabase();
  beforeEach(async () => {
    await addTestMp();
    await addTestPolitician();
  });

  it("sends the letter from its own address, copied to us, replying to the sender and to us, with the PDFs", async () => {
    vi.stubEnv("POLICY_INBOX", "replies@pauseai.uk");
    const sent = postmark(() => HttpResponse.json({ ErrorCode: 0, MessageID: "msg-1" }));

    expect(await submitLetter(FORM)).toEqual({ ok: true });

    const [letter] = await query<Record<string, unknown>>(
      `SELECT l.*, s.campaign, s.reply_hash, f.form, f.email, f.postcode, f.contact_consent
       FROM letters l JOIN letters_from_supporters s USING (id) JOIN form_entries f ON f.id = s.entry_id`,
    );
    expect(letter.reply_hash).toMatch(/^jane\.smith\.\d{6}$/);
    const address = `${letter.reply_hash}@letters.pauseai.uk`;
    expect(sent).toHaveLength(1);
    expect(sent[0].ReplyTo).toBeUndefined();
    expect(sent[0]).toMatchObject({
      From: `"Jane Smith via PauseAI" <${address}>`,
      To: '"Testy McTestface MP" <test-mp@example.org>',
      Bcc: "replies@pauseai.uk",
      Cc: '"Jane Smith" <jane@example.com>',
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
      form: "email-your-mp",
      email: "jane@example.com",
      postcode: "ZZ9 9ZZ",
      contact_consent: true,
      status: "sent",
    });
    expect(await query("SELECT purpose, letter_id::int AS id, address, outcome, message_id FROM email_sends")).toEqual([
      {
        purpose: "letter",
        id: Number(letter.id),
        address: "test-mp@example.org",
        outcome: "sent",
        message_id: "msg-1",
      },
    ]);
    expect(letter).not.toHaveProperty("body");
    expect(letter).not.toHaveProperty("body_html");
    expect(letter.sent_at).not.toBeNull();
    // The sender is a supporter from the moment the letter is kept.
    expect(
      await query(
        "SELECT s.id::int AS letter_id, k.matched_value FROM supporter_links k JOIN letters_from_supporters s ON s.entry_id = k.form_entry_id",
      ),
    ).toEqual([{ letter_id: Number(letter.id), matched_value: "jane@example.com" }]);
    expect(
      (await query<{ status: string }>("SELECT status FROM letter_events ORDER BY id")).map((e) => e.status),
    ).toEqual(["sending", "sent"]);
  });

  it("sends no Bcc when there's no shared inbox", async () => {
    vi.stubEnv("POLICY_INBOX", "");
    const sent = postmark();
    await submitLetter(FORM);
    expect(sent[0].Bcc).toBeUndefined();
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
    await query("UPDATE notable_people SET email = NULL WHERE id IN (SELECT id FROM politicians WHERE is_test)");
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

  it("in a fixture build, makes each letter's address from the sender and how many they've sent", async () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("OUTBOX_DIR", "");
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    const digits = (seed: string) =>
      String(createHash("sha256").update(seed).digest().readUInt32BE() % 1_000_000).padStart(6, "0");
    const letters = await query<{ reply_hash: string }>("SELECT reply_hash FROM letters_from_supporters ORDER BY id");
    expect(letters.map((l) => l.reply_hash)).toEqual([
      `jane.smith.${digits("letter jane@example.com 0")}`,
      `jane.smith.${digits("letter jane@example.com 1")}`,
    ]);
  });

  it("keeps nothing if Postmark refuses the letter, so the sender can try again", async () => {
    postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid email request" }, { status: 422 }));
    expect(await submitLetter(FORM)).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(await query("SELECT id FROM letters")).toEqual([]);
    // Nor the form entry made for it, nor the supporter's link to that.
    expect(await query("SELECT id FROM form_entries")).toEqual([]);
    expect(await query("SELECT id FROM supporter_links")).toEqual([]);
    // Nor its sender as first seen by it.
    expect(await query("SELECT first_seen_at FROM supporters")).toEqual([{ first_seen_at: null }]);

    postmark();
    expect(await submitLetter(FORM)).toEqual({ ok: true });
  });

  it("leaves the sender off the Cc when their address is blocked", async () => {
    const sent = postmark();
    await recordProblem({ address: "jane@example.com", messageId: null, kind: "hard", reason: "", canReset: true });
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].Cc).toBeUndefined();
  });

  it("sends the letter again without the Cc when Postmark refuses the sender's address", async () => {
    let tries = 0;
    const sent = postmark(() =>
      ++tries === 1
        ? HttpResponse.json(
            { ErrorCode: 406, Message: "Found inactive addresses: jane@example.com. Inactive recipients are…" },
            { status: 422 },
          )
        : HttpResponse.json({ ErrorCode: 0, MessageID: "msg-2" }),
    );
    expect(await submitLetter(FORM)).toEqual({ ok: true });
    expect(sent.map((email) => email.Cc)).toEqual(['"Jane Smith" <jane@example.com>', undefined]);
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "sent" }]);
  });

  it("doesn't send again when it failed for another reason, with the sender's address blocked or not", async () => {
    const sent = postmark(() => HttpResponse.json({ ErrorCode: 300, Message: "Invalid" }, { status: 422 }));
    expect(await submitLetter(FORM)).toMatchObject({ status: 500 });
    await recordProblem({ address: "jane@example.com", messageId: null, kind: "hard", reason: "", canReset: true });
    expect(await submitLetter(FORM)).toMatchObject({ status: 500 });
    expect(sent).toHaveLength(2);
  });

  it("keeps a letter to an MP whose address is blocked as not sent, and says why", async () => {
    const sent = postmark();
    await recordProblem({ address: "test-mp@example.org", messageId: null, kind: "hard", reason: "", canReset: true });
    expect(await submitLetter(FORM)).toEqual({ ok: false, status: 409, message: copy.errors.unreachable });
    expect(sent).toEqual([]);
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "not_sent" }]);
    expect(
      (await query<{ status: string }>("SELECT status FROM letter_events ORDER BY id")).map((e) => e.status),
    ).toEqual(["sending", "not_sent"]);
  });

  it("doesn't count a letter that wasn't sent towards the sender's one per campaign", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    postmark();
    const real = { ...FORM, postcode: "SW1A 1AA" };
    await recordProblem({
      address: "polly.placeholder.mp@parliament.uk",
      messageId: null,
      kind: "hard",
      reason: "",
      canReset: true,
    });
    expect(await submitLetter(real)).toMatchObject({ status: 409 });
    await query("DELETE FROM email_blocks");
    expect(await submitLetter(real)).toEqual({ ok: true });
  });

  it("says it failed if the letter can't be saved", async () => {
    const sent = postmark();
    await query("DROP TABLE letter_events");
    expect(await submitLetter(FORM)).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(sent).toEqual([]);
  });
});
