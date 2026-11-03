import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse } from "msw";
import { campaigns, copy } from "@/lib/content/email-your-mp";
import { draftLetter, signatureAddress } from "@/lib/email-your-mp";
import { draftHash } from "@/lib/letter-changes";
import { docFromMarkup, toText } from "@/lib/letter-format";
import {
  addTestMp,
  addTestPolitician,
  connectTestGmail,
  describeWithDatabase,
  useTestDatabase,
} from "@/tests/database";
import { LETTERS_INBOX, recordGmail, testProxy } from "@/tests/gmail-sends";
import { resetLettersInbox } from "@/tests/fixtures/letters-inbox";
import { query } from "./db";
import { recordProblem } from "./email";
import { LETTERS_DAILY_LIMIT } from "./letters-inbox";
import { mayWriteTo, parseLetterForm, submitLetter, type LetterForm } from "./mp-letters";

/** The draft the form gives Jane for the test MP and the letter to the PM: what the server rebuilds. */
function testDraft(): string {
  const campaign = campaigns.find((c) => c.slug === "regulate-letter-pm")!;
  return toText(
    draftLetter(
      campaign,
      { salutation: "Mr McTestface", constituency: "Testshire", senderName: "Jane Smith", statuses: {} },
      signatureAddress("1 High Street\nTestville", "zz9 9zz"),
    ),
  );
}

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
  draftHash: "",
  consent: true,
  nickname: "",
  turnstileToken: "token",
};

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
  vi.stubEnv("POLICY_INBOX", "policy@example.org");
  vi.spyOn(console, "error").mockImplementation(() => {});
  resetLettersInbox();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parseLetterForm", () => {
  it("trims strings, and treats anything else as empty", () => {
    expect(parseLetterForm({ name: " Jane ", consent: true, email: 5, draftHash: " 0badcafe " })).toMatchObject({
      name: "Jane",
      email: "",
      address: "",
      consent: true,
      draftHash: "0badcafe",
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
});

describeWithDatabase("submitLetter", () => {
  useTestDatabase();

  const statuses = async () =>
    (await query<{ status: string }>("SELECT status FROM letter_events ORDER BY id")).map((e) => e.status);

  beforeEach(async () => {
    await addTestMp();
    await addTestPolitician();
    await connectTestGmail(LETTERS_INBOX);
  });

  it("sends the letter from the sender's proxy to the MP, then their copy from it to the MP's, Bcc'd to them", async () => {
    const sent = recordGmail();
    expect(await submitLetter({ ...FORM, draftHash: draftHash(testDraft()) })).toEqual({ ok: true });

    expect(sent).toHaveLength(2);
    const [letter, copied] = sent;
    expect(letter.account).toBe(LETTERS_INBOX);
    expect(letter.headers.get("from")).toBe(`"Jane Smith (via PauseAI)" <${testProxy("jane.smith")}>`);
    expect(letter.headers.get("to")).toBe('"Testy McTestface MP" <test-mp@parliament.example>');
    // Nobody else: no Cc, no Bcc, and nothing goes to the policy inbox.
    expect(letter.headers.has("cc")).toBe(false);
    expect(letter.headers.has("bcc")).toBe(false);
    expect(letter.headers.get("subject")).toBe("Subject");
    expect(letter.text).toBe(
      "Dear Mr McTestface,\n\nPlease do sign.\n\nThanks,\n\nJane Smith\n\n1 High Street\nTestville\nZZ9 9ZZ",
    );
    expect(letter.html).toContain("<p>Please <strong>do</strong> sign.</p>");
    const files = letter.mime.parts.slice(1);
    expect(files.map((f) => f.headers.get("content-disposition"))).toEqual(
      campaigns[0].attachments.map((a) => `attachment; filename="${a.file}"`),
    );
    expect(files[0].body.equals(readFileSync("public/pdfs/Frontier-AI-Open-Letter.pdf"))).toBe(true);

    const mpProxy = `"Testy McTestface MP (via PauseAI)" <${testProxy("testy.mctestface.mp")}>`;
    expect(copied.headers.get("from")).toBe(letter.headers.get("from"));
    expect(copied.headers.get("to")).toBe(mpProxy);
    expect(copied.headers.get("reply-to")).toBe(mpProxy);
    expect(copied.headers.get("bcc")).toBe("jane@example.com");
    expect(copied.text).toBe(`${copy.letterCopy("Testy McTestface MP")}\n\n${letter.text}`);
    expect(copied.html).toMatch(/^<p>⁂ This is a copy of your letter/);
    expect(copied.mime.parts.slice(1)).toHaveLength(campaigns[0].attachments.length);

    const [row] = await query<Record<string, unknown>>(
      `SELECT l.status, l.sent_at IS NOT NULL AS sent, s.copy_state, s.postmark_mailbox, s.draft, s.draft_approximate,
         s.own_words, s.letter, p.tag, p.supporter_email, f.form, f.postcode, f.contact_consent
       FROM letters l JOIN letters_from_supporters s USING (id) JOIN proxies p ON p.id = s.proxy_id
         JOIN form_entries f ON f.id = s.entry_id`,
    );
    expect(row).toEqual({
      status: "sent",
      sent: true,
      copy_state: "sent",
      postmark_mailbox: null,
      draft: testDraft(),
      draft_approximate: false,
      own_words: expect.any(Number),
      letter: FORM.letter,
      tag: "jane.smith",
      supporter_email: "jane@example.com",
      form: "email-your-mp",
      postcode: "ZZ9 9ZZ",
      contact_consent: true,
    });
    expect(row.own_words).toBeGreaterThan(0);
    expect(await query("SELECT tag FROM proxies ORDER BY id")).toEqual([
      { tag: "jane.smith" },
      { tag: "testy.mctestface.mp" },
    ]);
    expect(await query("SELECT purpose, address, outcome, backend, sender FROM email_sends ORDER BY id")).toEqual([
      {
        purpose: "letter",
        address: "test-mp@parliament.example",
        outcome: "sent",
        backend: "gmail",
        sender: LETTERS_INBOX,
      },
      {
        purpose: "letter-copy",
        address: testProxy("testy.mctestface.mp"),
        outcome: "sent",
        backend: "gmail",
        sender: LETTERS_INBOX,
      },
    ]);
    expect(await statuses()).toEqual(["sent", "copy_sent"]);
    // The sender is a supporter from the moment the letter is kept.
    expect(await query("SELECT matched_value FROM supporter_links")).toEqual([{ matched_value: "jane@example.com" }]);
  });

  it("keeps a supporter's proxy for every letter, and names another's with the same name apart", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    await submitLetter(FORM);
    await submitLetter({ ...FORM, campaign: "support-sobel-bill", email: "JANE@example.com" });
    await submitLetter({ ...FORM, email: "other.jane@example.com" });
    expect(
      await query("SELECT p.tag FROM letters_from_supporters s JOIN proxies p ON p.id = s.proxy_id ORDER BY s.id"),
    ).toEqual([{ tag: "jane.smith" }, { tag: "jane.smith" }, { tag: "jane.smith.2" }]);
  });

  it("marks the draft approximate when the form's was another, as after a deploy", async () => {
    await submitLetter({ ...FORM, draftHash: "0badcafe" });
    expect(await query("SELECT draft_approximate FROM letters_from_supporters")).toEqual([{ draft_approximate: true }]);
  });

  it("sends a campaign without attachments without any", async () => {
    const sent = recordGmail();
    await submitLetter({ ...FORM, campaign: "support-sobel-bill" });
    expect(sent[0].mime.parts).toHaveLength(2);
  });

  it("pretends to accept a bot's letter, and sends nothing", async () => {
    const sent = recordGmail();
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

  it("refuses missing fields, a bad email, one of ours, and an unknown campaign", async () => {
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
    for (const ours of [LETTERS_INBOX, testProxy("jane.smith"), "Policy@example.org"]) {
      expect(await submitLetter({ ...FORM, email: ours })).toMatchObject({
        status: 400,
        message: copy.errors.ourAddress,
      });
    }
    expect(await submitLetter({ ...FORM, campaign: "nope" })).toMatchObject({
      status: 400,
      message: copy.errors.unknownCampaign,
    });
  });

  it("takes any address but the letters inbox's where there's no policy inbox", async () => {
    vi.stubEnv("POLICY_INBOX", "");
    expect(await submitLetter({ ...FORM, email: "policy@example.org" })).toEqual({ ok: true });
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
    const sent = recordGmail();
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" })).toMatchObject({
      status: 403,
      message: copy.errors.testMpOnly,
    });
    expect(sent).toEqual([]);
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    expect(await submitLetter({ ...FORM, postcode: "SW1A 1AA" })).toEqual({ ok: true });
    expect(sent).toHaveLength(2);
  });

  it("sends one letter per sender email per campaign, except to the test MPs", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
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
    expect(await query("SELECT count(*)::int AS n FROM letters WHERE status = 'sent'")).toEqual([{ n: 5 }]);
  });

  it("keeps a letter it can't send at once, queued with why, and the sender is told it's on its way", async () => {
    recordGmail(() => HttpResponse.json({ error: { code: 503 } }, { status: 503 }));
    expect(await submitLetter(FORM)).toEqual({ ok: true, queued: "failed" });
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "queued" }]);
    expect(await query("SELECT status, details FROM letter_events")).toEqual([
      { status: "queued", details: { reason: "failed" } },
    ]);
  });

  it("queues every letter while the letters inbox isn't connected, or is at its daily limit", async () => {
    await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
    expect(await submitLetter(FORM)).toEqual({ ok: true, queued: "not_connected" });
    await connectTestGmail(LETTERS_INBOX);
    await query(
      `INSERT INTO email_sends (purpose, address, outcome, message_id, backend, sender)
       SELECT 'relay', 'x@example.org', 'sent', 'm' || n, 'gmail', $1 FROM generate_series(1, $2) n`,
      [LETTERS_INBOX, LETTERS_DAILY_LIMIT - 1],
    );
    // Room for the letter, but not its copy as well.
    expect(await submitLetter(FORM)).toEqual({ ok: true, queued: "daily_limit" });
  });

  it("queues a letter to an MP whose address is blocked, until it works", async () => {
    const sent = recordGmail();
    await recordProblem({
      address: "test-mp@parliament.example",
      messageId: null,
      kind: "hard",
      reason: "",
      canReset: true,
    });
    expect(await submitLetter(FORM)).toEqual({ ok: true, queued: "blocked" });
    expect(sent).toEqual([]);
    expect(await statuses()).toEqual(["queued"]);
  });

  it("counts a queued letter as the sender's one for the campaign", async () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
    const real = { ...FORM, postcode: "SW1A 1AA" };
    expect(await submitLetter(real)).toMatchObject({ ok: true, queued: "not_connected" });
    expect(await submitLetter(real)).toMatchObject({ status: 409 });
  });

  it("says it failed, and keeps nothing, if the letter can't be saved", async () => {
    const sent = recordGmail();
    await query("DROP TABLE proxies CASCADE");
    expect(await submitLetter(FORM)).toMatchObject({ status: 500, message: copy.errors.failed });
    expect(sent).toEqual([]);
    expect(await query("SELECT id FROM letters")).toEqual([]);
  });
});
