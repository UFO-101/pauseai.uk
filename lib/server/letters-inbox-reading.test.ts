import { gunzipSync } from "node:zlib";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/content/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { NIGHTLY, runStatus, type GmailReading } from "@/lib/import-runs";
import { docFromMarkup } from "@/lib/letter-format";
import { addTestMp, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import {
  deliverToLettersInbox,
  keepSent,
  labelNames,
  lettersMailbox,
  resetLettersInbox,
} from "@/tests/fixtures/letters-inbox";
import {
  LETTERS_INBOX,
  recordGmail,
  stubLettersInboxEnv,
  testMail,
  testProxy,
  type TestMail,
} from "@/tests/gmail-sends";
import { query } from "./db";
import { readGmail } from "./gmail-reading";
import { authenticated } from "./letters-inbox-reading";
import { submitLetter, type LetterForm } from "./mp-letters";
import { letterReply } from "./outside-services/blobs";
import { RELAY_CAP } from "./relays";

const REQUEST = new Request("https://pauseai.uk/api/cron/read-gmail", { method: "POST" });
const MP = '"Testy McTestface MP" <test-mp@parliament.example>';
const JANE = "jane@example.com";
/** Jane as every email to her is addressed: her name and her own address. */
const JANE_LINE = `"Jane Smith" <${JANE}>`;
const JANES_PROXY = testProxy("jane.smith");
const MPS_PROXY = testProxy("testy.mctestface.mp");

const FORM: LetterForm = {
  campaign: "regulate-letter-pm",
  name: "Jane Smith",
  postcode: "zz9 9zz",
  address: "1 High Street",
  email: JANE,
  subject: "Please back a pause",
  letter: docFromMarkup("Dear Mr McTestface,\n\nPlease back a pause.\n\nJane Smith"),
  draftHash: "",
  consent: false,
  nickname: "",
  turnstileToken: "",
};

describe("authenticated", () => {
  const head = (results: string[]) =>
    `${results.map((r) => `Authentication-Results: ${r}`).join("\r\n")}\r\nFrom: a@example.org\r\n\r\nBody`;

  it("trusts Google's own results: DMARC passing for the From's domain", () => {
    expect(authenticated(head(["mx.google.com; dmarc=pass (p=REJECT) header.from=example.org"]), "a@example.org")).toBe(
      true,
    );
    expect(authenticated(head(["mx.google.com; dmarc=pass header.from=other.org"]), "a@example.org")).toBe(false);
    expect(authenticated(head(["mx.google.com; dmarc=pass"]), "a@example.org")).toBe(true);
    expect(authenticated(head(["mx.google.com; dkim=pass header.i=@example.org; dmarc=fail"]), "a@example.org")).toBe(
      false,
    );
  });

  it("with no DMARC policy, SPF or DKIM aligned with the From's domain", () => {
    expect(
      authenticated(head(["mx.google.com; spf=pass smtp.mailfrom=bounce.example.org; dmarc=none"]), "a@example.org"),
    ).toBe(true);
    expect(authenticated(head(["mx.google.com; dkim=pass header.d=example.org"]), "a@mail.example.org")).toBe(true);
    expect(authenticated(head(["mx.google.com; dkim=pass header.i=@example.org"]), "a@example.org")).toBe(true);
    expect(
      authenticated(
        head(["mx.google.com; spf=pass smtp.mailfrom=other.org; dkim=pass header.d=other.org"]),
        "a@example.org",
      ),
    ).toBe(false);
    expect(authenticated(head(["mx.google.com; spf=fail smtp.mailfrom=example.org"]), "a@example.org")).toBe(false);
    expect(authenticated(head(["mx.google.com; spf=pass"]), "a@example.org")).toBe(false);
    expect(authenticated(head(["mx.google.com; dkim=pass"]), "a@example.org")).toBe(false);
  });

  it("ignores any other server's results, which could be forged, and a message with none", () => {
    expect(authenticated(head(["evil.example; dmarc=pass header.from=example.org"]), "a@example.org")).toBe(false);
    expect(authenticated("From: a@example.org\r\n\r\nBody", "a@example.org")).toBe(false);
    // Folded over lines, as Google writes them.
    expect(
      authenticated(
        "Authentication-Results: mx.google.com;\r\n       dmarc=pass header.from=example.org\r\n\r\n",
        "a@example.org",
      ),
    ).toBe(true);
  });
});

describeWithDatabase("reading the letters inbox", () => {
  useTestDatabase();

  beforeEach(async () => {
    stubLettersInboxEnv();
    vi.spyOn(console, "error").mockImplementation(() => {});
    resetLettersInbox();
    await addTestMp();
    await connectTestGmail(LETTERS_INBOX);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  /** Writes Jane's letter to the test MP; gives its ID, and the Message-IDs of the letter and her copy. */
  async function write(form: Partial<LetterForm> = {}) {
    expect(await submitLetter({ ...FORM, ...form })).toEqual({ ok: true });
    const [row] = await query<{ id: number; letter: string; copy: string }>(
      `SELECT l.id::int AS id,
         (SELECT rfc_message_id FROM email_sends WHERE letter_id = l.id AND purpose = 'letter') AS letter,
         (SELECT rfc_message_id FROM email_sends WHERE letter_id = l.id AND purpose = 'letter-copy') AS copy
       FROM letters l ORDER BY l.id DESC LIMIT 1`,
    );
    return row;
  }

  const deliver = (mail: TestMail, spam = false) => deliverToLettersInbox(testMail(mail), { spam });

  /** Reads Gmail as the hourly job does; gives the letters inbox's line of the run. */
  const read = async () => (await readGmail(NIGHTLY, REQUEST)).accounts.find((a) => a.account === LETTERS_INBOX)!;

  /** The labels, by name, of the newest message in the letters inbox but those it sent elsewhere, which are only in Sent. */
  const labelsOfNewest = () =>
    labelNames(
      lettersMailbox()
        .messages.filter((m) => labelNames(m).join() !== "SENT")
        .at(-1)!,
    );
  const { labels } = staffCopy.lettersInbox;

  it("skips a message deleted between the history listing it and its fetch", async () => {
    await write();
    deliver({ from: MP, to: JANES_PROXY });
    const gone = lettersMailbox().messages.at(-1)!.id;
    server.use(
      http.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gone}`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    expect(await read()).toMatchObject({ replies: 0, relayed: 0, notUnderstood: [] });
    expect((await read()).error).toBeUndefined();
  });

  const events = async (letterId: number) =>
    query<{ status: string; details: Record<string, unknown> }>(
      "SELECT status, details FROM letter_events WHERE letter_id = $1 ORDER BY id",
      [letterId],
    );

  it("relays the office's reply to the supporter's proxy on to her, the same message, joining her copy's thread", async () => {
    const letter = await write();
    const reply = testMail({
      from: MP,
      to: JANES_PROXY,
      messageId: "reply-1@parliament.example",
      headers: ["Cc: someone@parliament.example"],
    });
    deliverToLettersInbox(reply);
    const sent = recordGmail();
    expect(await read()).toMatchObject({ replies: 1, autoReplies: 0, relayed: 1, spam: 0, notUnderstood: [] });

    expect(sent).toHaveLength(1);
    const [relay] = sent;
    expect(relay.headers.get("from")).toBe(`"Testy McTestface MP (via PauseAI)" <${MPS_PROXY}>`);
    expect(relay.headers.get("to")).toBe(JANE_LINE);
    expect(relay.headers.get("in-reply-to")).toBe(`<${letter.copy}>`);
    expect(relay.headers.get("references")).toBe(`<${letter.copy}>`);
    expect(relay.headers.get("subject")).toBe("Re: Request to co-sign letter on frontier AI risks");
    // Anyone the office copied in isn't sent it, nor told of them.
    expect(relay.headers.has("cc")).toBe(false);
    expect(relay.headers.has("authentication-results")).toBe(false);
    expect(relay.headers.get("message-id")).not.toBe("<reply-1@parliament.example>");
    // The body, byte for byte.
    expect(relay.raw.slice(relay.raw.indexOf("\r\n\r\n"))).toBe(reply.slice(reply.indexOf("\r\n\r\n")));

    const [kept] = await query<{ blobKey: string; fromSupporter: boolean; subject: string }>(
      `SELECT blob_key AS "blobKey", from_supporter AS "fromSupporter", subject FROM letter_replies`,
    );
    expect(kept).toMatchObject({ fromSupporter: false, subject: "Re: Request to co-sign letter on frontier AI risks" });
    expect(gunzipSync((await letterReply(kept.blobKey))!).toString("latin1")).toBe(reply);
    expect(await query('SELECT status, to_supporter AS "toSupporter" FROM letter_relays')).toEqual([
      { status: "sent", toSupporter: true },
    ]);
    expect((await events(letter.id)).slice(2)).toEqual([
      {
        status: "replied",
        details: {
          from: "test-mp@parliament.example",
          name: "Testy McTestface MP",
          to: JANES_PROXY,
          cc: "someone@parliament.example",
          gmailMessageId: expect.any(String),
          backend: "gmail",
          account: LETTERS_INBOX,
        },
      },
      {
        status: "relayed",
        details: {
          from: relay.headers.get("from"),
          to: JANE,
          messageId: expect.any(String),
          gmailMessageId: expect.any(String),
          backend: "gmail",
          account: LETTERS_INBOX,
        },
      },
    ]);
    expect(await query("SELECT replied_at IS NOT NULL AS replied FROM letters")).toEqual([{ replied: true }]);
    // Labelled, read and archived.
    expect(labelsOfNewest()).toEqual([labels.relayed]);
  });

  it("relays the supporter's answer, to either proxy, on to the MP's address, naming the letter", async () => {
    const letter = await write();
    deliver({ from: `"Jane Smith" <${JANE}>`, to: `${MPS_PROXY}, ${JANES_PROXY}`, text: "Thank you!\r\n" });
    const sent = recordGmail();
    expect(await read()).toMatchObject({ replies: 1, relayed: 1 });
    expect(sent[0].headers.get("from")).toBe(`"Jane Smith (via PauseAI)" <${JANES_PROXY}>`);
    expect(sent[0].headers.get("to")).toBe(MP);
    expect(sent[0].headers.get("in-reply-to")).toBe(`<${letter.letter}>`);
    expect(await query('SELECT from_supporter AS "fromSupporter" FROM letter_replies')).toEqual([
      { fromSupporter: true },
    ]);
    // Her answer isn't the MP's reply.
    expect(await query("SELECT replied_at FROM letters")).toEqual([{ replied_at: null }]);
  });

  it("relays automatic replies both ways, keeping what marks them", async () => {
    const letter = await write();
    deliver({ from: MP, to: JANES_PROXY, subject: "Automatic reply: Please back a pause" });
    deliver({
      from: JANE,
      to: MPS_PROXY,
      subject: "Out of office",
      headers: ["Auto-Submitted: auto-replied", "Precedence: auto_reply"],
    });
    const sent = recordGmail();
    expect(await read()).toMatchObject({ replies: 0, autoReplies: 2, relayed: 2 });
    expect(sent.map((s) => s.headers.get("to"))).toEqual([JANE_LINE, MP]);
    expect(sent[1].headers.get("auto-submitted")).toBe("auto-replied");
    expect(sent[1].headers.get("precedence")).toBe("auto_reply");
    expect((await events(letter.id)).map((e) => e.status).slice(2)).toEqual([
      "auto_reply",
      "relayed",
      "auto_reply",
      "relayed",
    ]);
    expect(await query("SELECT replied_at FROM letters")).toEqual([{ replied_at: null }]);
  });

  it("matches an automatic reply to the plain address by the email of ours it answers", async () => {
    const letter = await write();
    deliver({ from: MP, to: LETTERS_INBOX, subject: "Automatic reply", inReplyTo: letter.letter! });
    deliver({ from: JANE, to: LETTERS_INBOX, subject: "Out of office", inReplyTo: letter.copy! });
    const sent = recordGmail();
    expect(await read()).toMatchObject({ autoReplies: 2, relayed: 2, notUnderstood: [] });
    expect(sent.map((s) => s.headers.get("to"))).toEqual([JANE_LINE, MP]);
  });

  it("notes its own mail, and a copy sent to the MP's proxy as copies were, without relaying either", async () => {
    await write();
    // A copy from when copies went to the MP's proxy: in Sent, and back in the Inbox too.
    keepSent(testMail({ from: JANES_PROXY, to: MPS_PROXY, messageId: "old-copy@pauseai.uk" }), "oldcopy", true);
    const sent = recordGmail();
    expect(await read()).toMatchObject({ replies: 0, relayed: 0, notUnderstood: [] });
    expect(sent).toEqual([]);
    expect(labelsOfNewest()).toEqual(["SENT", labels.noted].sort());
    // A message from one of our own addresses, sent some other way, is noted too, as is the site's
    // own mail to it, such as a staff login link.
    deliver({ from: LETTERS_INBOX, to: JANES_PROXY, messageId: "elsewhere@pauseai.uk" });
    deliver({ from: "PauseAI UK <noreply@notify.pauseai.uk>", to: LETTERS_INBOX, subject: "Your login link" });
    expect(await read()).toMatchObject({ relayed: 0, notUnderstood: [] });
    expect(labelsOfNewest()).toEqual([labels.noted]);
  });

  it("handles each message once, though it comes again", async () => {
    await write();
    deliver({ from: MP, to: JANES_PROXY, messageId: "twice@parliament.example" });
    await read();
    deliver({ from: MP, to: JANES_PROXY, messageId: "twice@parliament.example" });
    const sent = recordGmail();
    expect(await read()).toMatchObject({ replies: 0, relayed: 0 });
    expect(sent).toEqual([]);
  });

  it("doesn't understand a stranger, an unknown proxy, or mail to none, and fails the run, telling staff once", async () => {
    await write();
    deliver({ from: "someone@example.com", to: JANES_PROXY, subject: "Hello" });
    deliver({ from: MP, to: testProxy("nobody.here"), subject: "Who?" });
    deliver({ from: MP, to: LETTERS_INBOX, subject: "Plain" });
    const sent = recordGmail();
    const line = await read();
    expect(line.notUnderstood).toEqual([
      { gmailMessageId: expect.any(String), from: "someone@example.com", subject: "Hello", reason: "stranger" },
      {
        gmailMessageId: expect.any(String),
        from: "test-mp@parliament.example",
        subject: "Who?",
        reason: "unknown_proxy",
      },
      { gmailMessageId: expect.any(String), from: "test-mp@parliament.example", subject: "Plain", reason: "no_proxy" },
    ]);
    expect(sent).toEqual([]);
    // Left in the inbox, unread, for a person.
    expect(labelsOfNewest()).toEqual(["INBOX", labels.notUnderstood, "UNREAD"].sort());
    const [run] = await query<GmailReading>("SELECT job, status, result FROM import_runs ORDER BY id DESC LIMIT 1");
    expect(runStatus(run)).toBe("failed");
  });

  it("doesn't understand a stranger answering one of our emails at the plain address, or writing to the MP's proxy", async () => {
    const letter = await write();
    deliver({
      from: "someone@example.com",
      to: LETTERS_INBOX,
      subject: "Re: Please back a pause",
      inReplyTo: letter.letter!,
    });
    deliver({ from: "someone@example.com", to: MPS_PROXY, subject: "Hello MP" });
    expect((await read()).notUnderstood!.map((m) => m.reason)).toEqual(["stranger", "stranger"]);
  });

  it("keeps and relays a message with no subject or Message-ID of its own", async () => {
    await write();
    deliverToLettersInbox(
      [
        "Authentication-Results: mx.google.com; dmarc=pass header.from=parliament.example",
        `From: ${MP}`,
        `To: ${JANES_PROXY}`,
        "",
        "Thanks.",
      ].join("\r\n"),
    );
    const sent = recordGmail();
    expect(await read()).toMatchObject({ relayed: 1 });
    expect(await query("SELECT subject, rfc_message_id FROM letter_replies")).toEqual([
      { subject: "", rfc_message_id: null },
    ]);
    expect(sent[0].headers.has("subject")).toBe(false);
  });

  it("searches the last few days of the letters inbox, Spam and Sent too, when its history has gone", async () => {
    await write();
    const { server } = await import("@/tests/fixtures/msw");
    const { http, HttpResponse } = await import("msw");
    let searched = "";
    server.use(
      http.get("https://gmail.googleapis.com/gmail/v1/users/me/history", () => HttpResponse.json({}, { status: 404 })),
      http.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", ({ request }) => {
        searched = new URL(request.url).searchParams.get("q")!;
        return HttpResponse.json({ messages: [] });
      }),
    );
    expect(await read()).toMatchObject({ restarted: true });
    expect(searched).toBe("in:anywhere newer_than:3d");
  });

  it("notes a bounce that's only delayed as soft, blocking nothing", async () => {
    const letter = await write();
    deliverToLettersInbox(
      [
        "From: postmaster@parliament.example",
        `To: ${LETTERS_INBOX}`,
        "Subject: Delayed",
        'Content-Type: multipart/report; report-type=delivery-status; boundary="r"',
        "",
        "--r",
        "Content-Type: message/delivery-status",
        "",
        "Reporting-MTA: dns; mx.parliament.example",
        "",
        "Final-Recipient: rfc822; test-mp@parliament.example",
        "Action: delayed",
        "Status: 4.4.1",
        "--r",
        "Content-Type: text/rfc822-headers",
        "",
        `Message-ID: <${letter.letter}>`,
        "--r--",
      ].join("\r\n"),
    );
    expect(await read()).toMatchObject({ bounces: 1 });
    expect(await query("SELECT kind FROM email_problems")).toEqual([{ kind: "soft" }]);
    expect(await query("SELECT address FROM email_blocks")).toEqual([]);
  });

  it("counts spam that matches no letter, and doesn't fail the run for it", async () => {
    await write();
    deliver({ from: "spammer@example.com", to: testProxy("guessed"), subject: "Win" }, true);
    expect(await read()).toMatchObject({ spam: 1, notUnderstood: [] });
    expect(labelsOfNewest()).toEqual([labels.spam]);
  });

  it("relays a letter's reply Gmail filed in Spam", async () => {
    await write();
    deliver({ from: MP, to: JANES_PROXY }, true);
    expect(await read()).toMatchObject({ relayed: 1, spam: 0 });
    expect(labelsOfNewest()).toEqual([labels.relayed]);
  });

  it("relays nothing that fails authentication, in Spam or not, and the history says why", async () => {
    const letter = await write();
    deliver(
      {
        from: MP,
        to: JANES_PROXY,
        auth: "dkim=fail; spf=softfail smtp.mailfrom=elsewhere.example; dmarc=fail header.from=parliament.example",
      },
      true,
    );
    const sent = recordGmail();
    expect((await read()).notUnderstood).toEqual([expect.objectContaining({ reason: "not_verified" })]);
    expect(sent).toEqual([]);
    expect(await query("SELECT id FROM letter_replies")).toEqual([]);
    expect((await events(letter.id)).at(-1)).toEqual({
      status: "not_relayed",
      details: expect.objectContaining({ reason: "not_verified", from: "test-mp@parliament.example" }),
    });
  });

  it("takes any Parliament address as the office's, and no other but the one the letter went to", async () => {
    await write();
    deliver({ from: "caseworker@parliament.uk", to: JANES_PROXY });
    deliver({ from: "someone@parliament.example", to: JANES_PROXY });
    const line = await read();
    expect(line.relayed).toBe(1);
    expect(line.notUnderstood).toEqual([
      expect.objectContaining({ from: "someone@parliament.example", reason: "stranger" }),
    ]);
  });

  it("stops relaying a letter at its cap, so a loop of automatic replies ends", async () => {
    const letter = await write();
    for (let i = 0; i <= RELAY_CAP.hour; i++) deliver({ from: MP, to: JANES_PROXY, subject: "Automatic reply" });
    const line = await read();
    expect(line.relayed).toBe(RELAY_CAP.hour);
    expect(line.notUnderstood).toEqual([expect.objectContaining({ reason: "over_cap" })]);
    expect((await events(letter.id)).at(-1)).toEqual({
      status: "not_relayed",
      details: { gmailMessageId: expect.any(String), reason: "over_cap" },
    });
  });

  it("tells staff once of every message not understood in a run, with a link to each in Gmail and to the runs", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    const { server } = await import("@/tests/fixtures/msw");
    const { http, HttpResponse } = await import("msw");
    const emails: { To: string; Subject: string; TextBody: string; Tag: string }[] = [];
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        emails.push((await request.json()) as (typeof emails)[number]);
        return HttpResponse.json({ ErrorCode: 0, MessageID: `m-${emails.length}` });
      }),
    );
    await write();
    deliver({ from: "someone@example.com", to: JANES_PROXY, subject: "Hello" });
    deliver({ from: "other@example.com", to: JANES_PROXY, subject: "Hi" });
    await read();
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      To: "notifications@example.org",
      Subject: staffCopy.lettersInbox.alert.subject(2, LETTERS_INBOX),
      Tag: "staff-alert",
    });
    expect(emails[0].TextBody).toContain(
      `https://mail.google.com/mail/?authuser=${encodeURIComponent(LETTERS_INBOX)}#all/`,
    );
    expect(emails[0].TextBody).toContain("https://pauseai.uk/staff/import-data/");
    // A run with nothing to tell sends nothing.
    await read();
    expect(emails).toHaveLength(1);
  });

  describe("which letter a message to the office's or the supporter's proxy is for", () => {
    /** Two letters from Jane to the test MP, as the test MPs take any number. */
    async function twoLetters() {
      const first = await write({ subject: "First letter" });
      const second = await write({ subject: "Second letter" });
      return { first, second };
    }
    const keptFor = async () =>
      query<{ letterId: number }>('SELECT letter_id::int AS "letterId" FROM letter_replies ORDER BY id');

    it("by the email of ours it names", async () => {
      const { first } = await twoLetters();
      deliver({ from: MP, to: JANES_PROXY, subject: "Re: something", inReplyTo: first.copy! });
      expect(await read()).toMatchObject({ relayed: 1, uncertain: 0 });
      expect(await keptFor()).toEqual([{ letterId: first.id }]);
    });

    it("by a Case Ref seen before on one of them", async () => {
      const { first } = await twoLetters();
      deliver({ from: MP, to: JANES_PROXY, subject: "Re: First letter (Case Ref: AB12345)" });
      await read();
      deliver({ from: MP, to: JANES_PROXY, subject: "Your case (Case Ref: AB12345)" });
      expect(await read()).toMatchObject({ uncertain: 0 });
      expect(await keptFor()).toEqual([{ letterId: first.id }, { letterId: first.id }]);
    });

    it("by the letter's subject in its own", async () => {
      const { first } = await twoLetters();
      deliver({ from: MP, to: JANES_PROXY, subject: "RE: first letter" });
      await read();
      expect(await keptFor()).toEqual([{ letterId: first.id }]);
    });

    it("failing those, the latest, as an uncertain match", async () => {
      const { second } = await twoLetters();
      deliver({ from: MP, to: JANES_PROXY, subject: "Your email" });
      expect(await read()).toMatchObject({ relayed: 1, uncertain: 1 });
      expect(await keptFor()).toEqual([{ letterId: second.id }]);
      expect((await events(second.id)).at(-2)?.details).toMatchObject({ uncertain: true });
    });
  });

  it("records a bounce of the letter: the letter bounced, staff alerted, and the supporter told in our own words", async () => {
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    const letter = await write();
    deliverToLettersInbox(
      [
        "From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
        `To: ${LETTERS_INBOX}`,
        "Subject: Delivery Status Notification (Failure)",
        "Message-ID: <bounce-1@google.com>",
        `In-Reply-To: <${letter.letter}>`,
        "X-Failed-Recipients: test-mp@parliament.example",
        "Content-Type: text/plain",
        "",
        "The address couldn't be found.",
      ].join("\r\n"),
    );
    const sent = recordGmail();
    expect(await read()).toMatchObject({ bounces: 1, notUnderstood: [] });
    expect(await query("SELECT status FROM letters")).toEqual([{ status: "bounced" }]);
    expect(await query("SELECT address FROM email_blocks")).toEqual([{ address: "test-mp@parliament.example" }]);
    // The notice: from the letters inbox as PauseAI, to Jane, in her copy's thread.
    expect(sent).toHaveLength(1);
    expect(sent[0].headers.get("from")).toBe(`"PauseAI" <${LETTERS_INBOX}>`);
    expect(sent[0].headers.get("to")).toBe(JANE_LINE);
    expect(sent[0].headers.get("in-reply-to")).toBe(`<${letter.copy}>`);
    expect(sent[0].text).toBe(copy.notices.bounced("Testy McTestface MP"));
    expect((await events(letter.id)).map((e) => e.status).slice(2)).toEqual(["bounced", "notice"]);
    expect(await query("SELECT purpose FROM email_sends WHERE purpose = 'staff-alert'")).toEqual([
      { purpose: "staff-alert" },
    ]);
  });

  it("doesn't understand a bounce of nothing we sent", async () => {
    await write();
    deliverToLettersInbox(
      ["From: postmaster@example.org", `To: ${LETTERS_INBOX}`, "Subject: Undeliverable", "", "No such user."].join(
        "\r\n",
      ),
    );
    expect((await read()).notUnderstood).toEqual([expect.objectContaining({ reason: "bounce" })]);
  });
});
