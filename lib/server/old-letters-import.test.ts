import { staffCopy } from "@/lib/content/staff-interface";
import { NIGHTLY } from "@/lib/import-runs";
import { latestRun } from "./import-runs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import webForm from "@/tests/fixtures/airtable-web-form.json";
import {
  addTestLetter,
  addTestPolitician,
  connectTestGmail,
  describeWithDatabase,
  useTestDatabase,
} from "@/tests/database";
import { stubLettersInboxEnv } from "@/tests/gmail-sends";
import { sentToday } from "./gmail-accounts";
import { query, transaction } from "./db";
import { importOldLetters, jobProgress, politicianSearches } from "./old-letters-import";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

/** The fixture's politicians and letters, as the syncs copy them, at the moments the fake mailbox's mail went. */
async function seed() {
  const politician = (name: string, email: string, salutation: string) =>
    addTestPolitician({ name, email, salutation, constituency: `${name}'s seat`, airtableId: null });
  const polly = await politician("Polly Placeholder", "polly.placeholder.mp@parliament.uk", "Ms Placeholder");
  const dora = await politician("Dora Dummy", "mp90001.office@parliament.uk", "Ms Dummy");
  const mo = await politician("Mo Example", "mp90003.office@parliament.uk", "Mx Example");
  const morag = await politician("Morag Example", "morag.example.msp@parliament.example", "Ms Example");
  const mailingLetter = async (person: number, mailing: string, at: string, airtableId: string) => {
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at) VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id`,
      [person, at],
    );
    await query(
      `INSERT INTO letters_from_pauseai (id, mailing_id, airtable_id)
       SELECT $1, id, $3 FROM mailings
       WHERE airtable_field = $2 OR (ask = 'deepmind-letter' AND airtable_sent_between @> '2025-06-02'::timestamptz AND $2 = 'DeepMind letter')
       ORDER BY id LIMIT 1`,
      [id, mailing, airtableId],
    );
    return id;
  };
  const deepmind = await mailingLetter(polly, "DeepMind letter", "2025-07-09T11:00:00Z", "recA");
  const csrb = await mailingLetter(dora, "CSRB Iqbal Amendment", "2026-06-10T09:00:00Z", "recB");
  const edinburgh = await mailingLetter(
    morag,
    "Edinburgh Conference Nov 26 Invitation",
    "2026-10-01T10:05:00Z",
    "recC",
  );
  const debate = await mailingLetter(dora, "Ben Lake October 2026 Debate", "2026-10-15T08:30:00Z", "recD");
  // One August letter, with no sent email, and one from June the same.
  const august = await mailingLetter(polly, "DeepMind letter", "2025-08-08T09:00:00Z", "recE");
  const june = await mailingLetter(mo, "DeepMind letter", "2025-06-10T09:00:00Z", "recF");
  const form = await addTestLetter({
    politicianId: polly,
    campaign: "pauseai-info-frontier-ai",
    senderName: "Wendy Webform",
    senderEmail: "Wendy.Webform@example.com",
    subject: "Please sign the letter on frontier AI",
    createdAt: "2026-09-25T09:00:00Z",
    sentAt: "2026-09-25T09:01:00Z",
  });
  await query(
    "UPDATE letters_from_supporters SET airtable_id = 'recWebWendyFrontier', postmark_mailbox = NULL WHERE id = $1",
    [form],
  );
  return { polly, dora, mo, morag, deepmind, csrb, edinburgh, debate, august, june, form };
}

async function run() {
  await connectTestGmail("joseph@pauseai.uk");
  await connectTestGmail("policy@pauseai.uk");
  return importOldLetters("jo@pauseai.uk", 0);
}

/** The fake Gmail's copy of a message, replaced: its headers and bytes, in whichever format it's asked for. */
function mailIs(id: string, threadId: string, at: string, headers: Record<string, string>, body: Buffer) {
  const lines = Object.entries(headers);
  server.use(
    http.get(`${GMAIL}/messages/${id}`, ({ request }) => {
      const base = { id, threadId, labelIds: ["SENT"], internalDate: String(Date.parse(at)) };
      if (new URL(request.url).searchParams.get("format") === "raw") {
        const head = lines.map(([name, value]) => `${name}: ${value}`).join("\r\n");
        const raw = Buffer.concat([Buffer.from(`${head}\r\n\r\n`), body]);
        return HttpResponse.json({ ...base, raw: raw.toString("base64url") });
      }
      return HttpResponse.json({
        ...base,
        payload: {
          headers: lines.map(([name, value]) => ({ name, value })),
          mimeType: "text/plain",
          body: { data: body.toString("base64url") },
        },
      });
    }),
  );
}

/** A form letter's email, From rewritten and its sender to reply to, as pauseai.info's form sent them. */
const fromTheForm = (name: string, address: string, to: string) => ({
  From: `'${name}' via PauseAI <joseph@pauseai.info>`,
  "Reply-To": `${address}, info@pauseai.info`,
  To: to,
  Subject: "Request to co-sign letter on Google's breach of AI safety pledges",
  "Message-ID": "<repeat@mail.gmail.com>",
  "Content-Type": "text/plain; charset=utf-8",
});

/** The text kept of the letter that a message's mail row names. */
const ownTextOf = async (id: string) =>
  (
    await query<{ own: string | null }>(
      `SELECT p.own_text AS own FROM old_letters_mail o JOIN letters_from_pauseai p ON p.id = o.letter_id WHERE o.gmail_message_id = $1`,
      [id],
    )
  )[0].own;

const garble = (id: string, text: string) =>
  query(
    `UPDATE letters_from_pauseai SET own_text = $2 WHERE id = (SELECT letter_id FROM old_letters_mail WHERE gmail_message_id = $1)`,
    [id, text],
  );

const outcomeOf = async (id: string) =>
  (
    await query<{ outcome: string; letterId: number | null }>(
      `SELECT outcome, letter_id::int AS "letterId" FROM old_letters_mail WHERE gmail_message_id = $1`,
      [id],
    )
  )[0];

describeWithDatabase("the import of old letters", () => {
  useTestDatabase();
  beforeEach(async () => {
    stubLettersInboxEnv();
    vi.stubEnv("GMAIL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("AIRTABLE_TOKEN", "fixture");
    // The mailings it fills outlast each test, and it keeps a template it has made.
    await query("UPDATE mailings SET imported_text = NULL WHERE old_letters_key IS NOT NULL");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("joins each sent email to its letter, by mailing, with its real date and Message-ID", async () => {
    const seeded = await seed();
    const result = await run();
    expect(result.finished).toBe(true);
    expect(result.left).toBe(0);
    expect(result.titles).toMatchObject({
      "deepmind-25": staffCopy.oldLetters.mailingTitles["deepmind-25"],
      "pauseai-info-frontier-ai": "Regulate AI developers now (Airtable)",
    });
    expect(result.joined).toMatchObject({
      "deepmind-25": 1,
      csrb: 1,
      edinburgh: 1,
      "ben-lake": 1,
      "pauseai-info-frontier-ai": 1,
    });
    const [send] = await query<Record<string, unknown>>(
      `SELECT purpose, sender, from_address AS "from", rfc_message_id AS rfc, imported, subject, at FROM email_sends WHERE letter_id = $1`,
      [seeded.deepmind],
    );
    expect(send).toMatchObject({
      purpose: "mailing",
      sender: "joseph@pauseai.uk",
      from: "joseph@pauseai.info",
      rfc: "0a01@mail.gmail.com",
      imported: true,
    });
    expect(new Date(send.at as string)).toEqual(new Date("2025-07-09T10:59:30Z"));
    const [{ key }] = await query<{ key: string }>(
      `SELECT m.old_letters_key AS key FROM letters_from_pauseai p JOIN mailings m ON m.id = p.mailing_id WHERE p.id = $1`,
      [seeded.deepmind],
    );
    expect(key).toBe("deepmind-25");
  });

  it("never counts an imported email against the day's limit, as it keeps its real date", async () => {
    await seed();
    await run();
    expect(await sentToday("joseph@pauseai.uk")).toBe(0);
  });

  it("keeps a template and each letter's greeting and own paragraph, and sets who it went from", async () => {
    const seeded = await seed();
    const added = await run();
    expect(added.templates).toBeGreaterThan(0);
    const [letter] = await query<{ values: unknown; own: string | null }>(
      "SELECT merge_values AS values, own_text AS own FROM letters_from_pauseai WHERE id = $1",
      [seeded.deepmind],
    );
    expect(letter).toEqual({
      values: { values: { greeting: "Dear Ms Placeholder,", own: "You spoke well on the Bill." }, meets: [] },
      own: null,
    });
    const [mailing] = await query<{ text: { content: unknown[] }; from: string; subject: string }>(
      `SELECT imported_text AS text, sent_from AS from, subject FROM mailings WHERE old_letters_key = 'deepmind-25'`,
    );
    expect(mailing.from).toBe("joseph@pauseai.info");
    expect(mailing.subject).toBe("Request to co-sign letter on Google's breach of AI safety pledges");
    // Its greeting, then its two paragraphs either side of each letter's own, and the signature.
    expect(mailing.text.content).toHaveLength(5);
  });

  it("keeps a letter that doesn't fit its template whole", async () => {
    await seed();
    await run();
    const rows = await query<{ own: string }>(
      `SELECT p.own_text AS own FROM letters_from_pauseai p JOIN mailings m ON m.id = p.mailing_id WHERE m.old_letters_key = 'russell-speak'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].own).toContain("Would you speak?");
  });

  it("adds a letter production has no record of to its mailing", async () => {
    const { mo } = await seed();
    const result = await run();
    expect(result.added["russell-speak"]).toBe(1);
    const [row] = await query<{ person: number; status: string }>(
      `SELECT l.notable_person_id::int AS person, l.status FROM old_letters_mail o JOIN letters l ON l.id = o.letter_id WHERE o.gmail_message_id = '0a12'`,
    );
    expect(row).toEqual({ person: mo, status: "sent" });
  });

  it("copies a form letter's text from Airtable, with the form's version live then as its draft", async () => {
    const { form } = await seed();
    const result = await run();
    expect(result.formTexts).toBe(1);
    const [letter] = await query<{ letter: { content: unknown[] }; draft: string; own: number; approx: boolean }>(
      "SELECT letter, draft, own_words AS own, draft_approximate AS approx FROM letters_from_supporters WHERE id = $1",
      [form],
    );
    expect(letter.letter.content.length).toBeGreaterThan(1);
    expect(letter.draft).toContain("Dear Ms Placeholder");
    expect(letter.draft).toContain("Wendy Webform");
    expect(letter.own).toBeGreaterThan(0);
    expect(letter.approx).toBe(false);
  });

  it("joins replies: by Gmail thread, Message-ID, subject and time; a person's whole, an automatic one as an event", async () => {
    const seeded = await seed();
    await run();
    expect(await outcomeOf("0a03")).toEqual({ outcome: "reply", letterId: seeded.deepmind });
    expect(await outcomeOf("0a04")).toEqual({ outcome: "reply", letterId: seeded.deepmind });
    expect(await outcomeOf("0a05")).toEqual({ outcome: "auto_reply", letterId: seeded.csrb });
    expect(await outcomeOf("0a08")).toEqual({ outcome: "reply", letterId: seeded.form });
    expect(await outcomeOf("0a10")).toEqual({ outcome: "auto_reply", letterId: seeded.edinburgh });
    const replies = await query<{ from: string; fromUs: boolean }>(
      `SELECT from_address AS "from", from_us AS "fromUs" FROM letter_replies WHERE letter_id = $1 ORDER BY at`,
      [seeded.deepmind],
    );
    expect(replies).toEqual([
      { from: "polly.placeholder.mp@parliament.uk", fromUs: false },
      { from: "joseph@pauseai.info", fromUs: true },
    ]);
    const [{ at }] = await query<{ at: Date }>(
      "SELECT at FROM letter_events WHERE letter_id = $1 AND status = 'auto_reply'",
      [seeded.csrb],
    );
    expect(new Date(at)).toEqual(new Date("2026-06-10T09:01:00Z"));
  });

  it("joins a reply to an August letter by its subject, though it has no sent email", async () => {
    const { august } = await seed();
    await run();
    expect(await outcomeOf("0a19")).toEqual({ outcome: "reply", letterId: august });
    const [{ text }] = await query<{ text: { content: unknown[] } | null }>(
      `SELECT imported_text AS text FROM mailings WHERE old_letters_key = 'deepmind-august'`,
    );
    expect(text?.content).toHaveLength(2);
  });

  it("sets replied_at from a person's first reply", async () => {
    const { deepmind, csrb } = await seed();
    await run();
    const replied = async (id: number) =>
      (await query<{ at: Date | null }>("SELECT replied_at AS at FROM letters WHERE id = $1", [id]))[0].at;
    expect(new Date((await replied(deepmind))!)).toEqual(new Date("2025-07-10T09:00:00Z"));
    expect(await replied(csrb)).toBeNull();
  });

  it("keeps every other thread as a one-off email, whole, threaded by what it answers", async () => {
    const { polly } = await seed();
    await run();
    const threads = await query<{ subject: string; someone: boolean; people: number[]; n: number }>(
      `SELECT t.subject, t.someone_else AS someone,
         (SELECT coalesce(array_agg(p.notable_person_id::int), '{}') FROM one_off_thread_people p WHERE p.thread_id = t.id) AS people,
         (SELECT count(*)::int FROM one_off_messages m WHERE m.thread_id = t.id) AS n
       FROM one_off_threads t ORDER BY t.subject`,
    );
    const thread = (subject: string) => threads.find((t) => t.subject === subject);
    expect(thread("Coffee next week?")).toEqual({
      subject: "Coffee next week?",
      someone: false,
      people: [polly],
      n: 2,
    });
    // Parliament's domain, with no one we know: it counts, and whose it is isn't known. Not PauseAI's or a politician's, but on Parliament's domain.
    expect(thread("Room booking request")).toMatchObject({ people: [], n: 2 });
    // A volunteer forwarding a politician's email: found by its quote, someone else, under that politician.
    expect(thread("Fwd: My MP's answer")).toMatchObject({ people: [polly], someone: true, n: 1 });
    expect(thread("Please back the bill")).toMatchObject({ someone: true });
  });

  it("reads the mail in the group whose From it rewrote as from its real sender", async () => {
    await seed();
    await run();
    const [{ from }] = await query<{ from: string }>(
      "SELECT from_address AS from FROM one_off_messages WHERE rfc_message_id = '0a16@parliament.example'",
    );
    expect(from).toBe("mp90003.office@parliament.uk");
  });

  it("keeps only the Gmail ID of mail that matches nothing, and lists it on its results", async () => {
    await seed();
    const { unmatched } = await run();
    expect(unmatched).toEqual(
      expect.arrayContaining([
        { from: "Neil Nobody <neil.nobody@example.com>", subject: "Volunteering" },
        { from: "Sue Stranger <sue.stranger@example.com>", subject: "Are you hiring?" },
      ]),
    );
    expect((await outcomeOf("0a18")).outcome).toBe("unmatched");
    expect(await query("SELECT 1 FROM one_off_messages WHERE gmail_message_id = '0a18'")).toEqual([]);
  });

  it("moves letters with no sent email in August to that mailing, with its numbers, and says what didn't join", async () => {
    const { august, june } = await seed();
    const result = await run();
    expect(result.notJoined["deepmind-august"]).toBe(1);
    expect(result.notJoined["deepmind-others"]).toBe(1);
    const place = async (id: number) =>
      (
        await query<{ key: string; values: { values?: Record<string, string> } | null }>(
          `SELECT m.old_letters_key AS key, p.merge_values AS values FROM letters_from_pauseai p JOIN mailings m ON m.id = p.mailing_id WHERE p.id = $1`,
          [id],
        )
      )[0];
    expect(await place(august)).toEqual({
      key: "deepmind-august",
      values: { values: { greeting: "Dear Ms Placeholder,", colleagues: "50" }, meets: [] },
    });
    expect((await place(june)).key).toBe("deepmind-others");
  });

  it("rebuilds August's text from a reply quoting it, marked approximate", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    await query(
      `INSERT INTO old_letters_mail (account, gmail_message_id, source, outcome, quoted) VALUES
       ('joseph@pauseai.uk', 'quoted1', 'received', 'reply', 'Dear You,

Please join 40 of your colleagues.')`,
    );
    await importOldLetters("jo@pauseai.uk", 0);
    // The press deletes nothing of a real run, so the quote is read, and cleared once used.
    const [mailing] = await query<{ approx: boolean; text: { content: unknown[] } }>(
      `SELECT imported_text_approximate AS approx, imported_text AS text FROM mailings WHERE old_letters_key = 'deepmind-august'`,
    );
    expect(mailing.approx).toBe(true);
    expect(mailing.text.content).toHaveLength(2);
    expect(await query("SELECT 1 FROM old_letters_mail WHERE quoted IS NOT NULL")).toEqual([]);
  });

  it("keeps a thread whole: a message no search found, once its thread is kept", async () => {
    await seed();
    await run();
    expect((await outcomeOf("0a20")).outcome).toBe("one_off");
    const [{ someone }] = await query<{ someone: boolean }>(
      "SELECT someone_else AS someone FROM one_off_threads WHERE subject = 'Room booking request'",
    );
    expect(someone).toBe(true);
  });

  it("keeps a thread whole in a mailbox listed whole: what came before the message that counts, and after, off the list of what matched nothing", async () => {
    await seed();
    const { unmatched } = await run();
    for (const id of ["0b08", "0b09", "0b10"]) expect((await outcomeOf(id)).outcome).toBe("one_off");
    const kept = await query<{ thread: number }>(
      `SELECT DISTINCT thread_id::int AS thread FROM one_off_messages WHERE gmail_message_id IN ('0b08', '0b09', '0b10')`,
    );
    expect(kept).toHaveLength(1);
    expect(await query("SELECT subject FROM one_off_threads WHERE id = $1", [kept[0].thread])).toEqual([
      { subject: "Should I write to my MP?" },
    ]);
    expect(
      await query("SELECT 1 FROM one_off_messages WHERE gmail_message_id IN ('0b08', '0b09', '0b10')"),
    ).toHaveLength(3);
    expect(unmatched.map((m) => m.subject)).not.toContain("Should I write to my MP?");
    expect(unmatched.map((m) => m.subject)).not.toContain("Re: Should I write to my MP?");
  });

  it("keeps on a later press what an earlier run left as matching nothing in a thread since kept", async () => {
    await seed();
    await run();
    await query("DELETE FROM one_off_messages WHERE gmail_message_id = '0b08'");
    await query("UPDATE old_letters_mail SET source = 'policy', outcome = 'unmatched' WHERE gmail_message_id = '0b08'");
    const { finished } = await run();
    expect(finished).toBe(true);
    expect((await outcomeOf("0b08")).outcome).toBe("one_off");
    expect(await query("SELECT 1 FROM one_off_messages WHERE gmail_message_id = '0b08'")).toHaveLength(1);
  });

  describe("catching up the threads kept", () => {
    /** A message the regular read kept, in a thread of its own. */
    const keptByRead = async (account: string, id: string, thread: string) => {
      const [{ threadId }] = await query<{ threadId: number }>(
        'INSERT INTO one_off_threads (latest_at) VALUES (now()) RETURNING id::int AS "threadId"',
      );
      const [{ row }] = await query<{ row: number }>(
        `INSERT INTO one_off_messages (thread_id, account, gmail_message_id, gmail_thread_id, from_address, addresses, at, from_us, blob_key, size)
         VALUES ($1, $2, $3, $4, 'x@example.com', '{}', now(), false, $5, 1) RETURNING id::int AS row`,
        [threadId, account, id, thread, `one-off/${id}`],
      );
      return row;
    };

    it("keeps what's missing of a thread another read kept, reading no more of it, and only in its own mailboxes", async () => {
      await seed();
      await keptByRead("joseph@pauseai.uk", "0a41", "t-read");
      await keptByRead("jo@pauseai.uk", "z", "t-someone-elses");
      const { finished } = await run();
      expect(finished).toBe(true);
      expect((await outcomeOf("0a40")).outcome).toBe("one_off");
      expect(await query("SELECT 1 FROM one_off_messages WHERE gmail_message_id = '0a40'")).toHaveLength(1);
      expect(await outcomeOf("0a41")).toBeUndefined();
    });

    it("carries on from its place after Gmail refuses", async () => {
      await seed();
      const first = await keptByRead("joseph@pauseai.uk", "0a41", "t-read");
      await keptByRead("joseph@pauseai.uk", "r", "t-refused");
      let refuse = true;
      const asked = vi.fn();
      server.use(
        http.get(`${GMAIL}/threads/t-refused`, () =>
          refuse ? new HttpResponse("{}", { status: 429 }) : HttpResponse.json({ messages: [{ id: "r" }] }),
        ),
      );
      server.events.on("request:start", ({ request }) => {
        if (request.url.includes("/threads/t-read")) asked();
      });
      vi.spyOn(console, "error").mockImplementation(() => {});
      const stopped = await run();
      expect(stopped.finished).toBe(false);
      expect(stopped.threadsDone).toBe(first);
      refuse = false;
      const again = await run();
      expect(again.finished).toBe(true);
      expect(asked).toHaveBeenCalledTimes(1);
      server.events.removeAllListeners("request:start");
    });

    it("passes over a thread that's gone, and notes one Gmail won't give", async () => {
      await seed();
      await keptByRead("joseph@pauseai.uk", "g", "t-gone");
      await keptByRead("joseph@pauseai.uk", "r", "t-refused");
      server.use(
        http.get(`${GMAIL}/threads/t-gone`, () => new HttpResponse("{}", { status: 404 })),
        http.get(`${GMAIL}/threads/t-refused`, () => new HttpResponse("{}", { status: 400 })),
      );
      const { finished, unreadable } = await run();
      expect(finished).toBe(true);
      expect(unreadable).toEqual(["t-refused"]);
    });
  });

  it("passes over mail that's none of its business, or a copy of what it's read, and lists neither ours nor what it has", async () => {
    await seed();
    const { unmatched } = await run();
    expect((await outcomeOf("0a22")).outcome).toBe("skipped");
    expect((await outcomeOf("0b05")).outcome).toBe("skipped");
    expect((await outcomeOf("0b07")).outcome).toBe("unmatched");
    expect((await outcomeOf("0b06")).outcome).toBe("unmatched");
    expect(unmatched.map((m) => m.subject)).not.toContain("Rota");
    expect((await outcomeOf("0a23")).outcome).toBe("one_off");
    expect((await outcomeOf("0a28")).outcome).toBe("one_off");
  });

  it("skips an email the site itself sent", async () => {
    await seed();
    await query(
      `INSERT INTO email_sends (purpose, address, outcome, message_id, backend, sender) VALUES ('mailing-test', 'x@example.com', 'sent', '0a13', 'gmail', 'joseph@pauseai.uk')`,
    );
    await run();
    expect((await outcomeOf("0a13")).outcome).toBe("skipped");
  });

  it("keeps a Postmark letter's text from its copy; for one we've no record of, nothing", async () => {
    const { dora } = await seed();
    const letter = await addTestLetter({ politicianId: dora, senderEmail: "pm@example.com" });
    await query(
      `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ('letter', $1, 'x@parliament.uk', 'sent', 'fixture-postmark-1')`,
      [letter],
    );
    const real = await run();
    expect(real.postmarkTexts).toBe(1);
    expect(
      JSON.stringify(
        (await query<{ letter: unknown }>("SELECT letter FROM letters_from_supporters WHERE id = $1", [letter]))[0]
          .letter,
      ),
    ).toContain("as sent by Postmark");
    expect((await outcomeOf("0b04")).outcome).toBe("skipped");
  });

  it("reads a sent email of only HTML", async () => {
    const { mo } = await seed();
    const html = Buffer.from("<p>Dear Mx Example,</p><p>Would you speak, in HTML?</p>").toString("base64url");
    server.use(
      http.get(`${GMAIL}/messages/0a12`, () =>
        HttpResponse.json({
          id: "0a12",
          threadId: "t-russell",
          internalDate: String(Date.parse("2026-07-01T09:00:00Z")),
          payload: {
            headers: [
              { name: "From", value: "joseph@pauseai.info" },
              { name: "To", value: "mp90003.office@parliament.uk" },
              { name: "Subject", value: "Invitation to speak on panel with Professor Stuart Russell" },
            ],
            mimeType: "text/html",
            body: { data: html },
          },
        }),
      ),
    );
    await run();
    const [{ own, person }] = await query<{ own: string; person: number }>(
      `SELECT p.own_text AS own, l.notable_person_id::int AS person FROM old_letters_mail o JOIN letters l ON l.id = o.letter_id
         JOIN letters_from_pauseai p ON p.id = l.id WHERE o.gmail_message_id = '0a12'`,
    );
    expect(own).toContain("Would you speak, in HTML?");
    expect(person).toBe(mo);
  });

  it("reads a letter whose bytes aren't in the charset it names, with its curly quotes whole", async () => {
    await seed();
    mailIs(
      "0a12",
      "t-russell",
      "2026-07-01T09:00:00Z",
      {
        From: "joseph@pauseai.info",
        To: "mp90003.office@parliament.uk",
        Subject: "Invitation to speak on panel with Professor Stuart Russell",
        "Content-Type": "text/plain; charset=utf-8",
      },
      Buffer.from("Dear Ms N\u00ed,\n\nI\x19m asking\u00a0you.", "latin1"),
    );
    await run();
    expect(await ownTextOf("0a12")).toBe("Dear Ms N\u00ed,\n\nI\u2019m asking\u00a0you.");
  });

  it("makes kept text's characters whole again, reading none", async () => {
    await seed();
    await run();
    await garble("0a12", "I\x19m \x1cwhole\x1d.");
    const again = await run();
    expect(await ownTextOf("0a12")).toBe("I\u2019m \u201cwhole\u201d.");
    expect(again.read).toBe(0);
  });

  it("reads a garbled letter again, its text from the mail, and counts it", async () => {
    await seed();
    await run();
    await garble("0a12", "Dear Mx Example,\n\nWould you\uFFFDspeak?");
    const again = await run();
    expect(await ownTextOf("0a12")).toContain("Would you speak?");
    expect(again.read).toBe(1);
    expect(again.textsDone).toBeGreaterThan(0);
  });

  it("passes over a letter that stays garbled, is gone, or that Gmail won't give, and finishes", async () => {
    await seed();
    await run();
    await garble("0a12", "gone \uFFFD");
    await garble("0a25", "kept \uFFFD");
    await garble("0a27", "refused \uFFFD");
    const stays = Buffer.from("still \uFFFD");
    mailIs("0a25", "t-wh-1", "2025-12-05T09:00:00Z", { "Content-Type": "text/plain; charset=utf-8" }, stays);
    server.use(
      http.get(`${GMAIL}/messages/0a12`, () => new HttpResponse("{}", { status: 404 })),
      http.get(`${GMAIL}/messages/0a27`, () => new HttpResponse("{}", { status: 400 })),
    );
    const again = await run();
    expect(again.finished).toBe(true);
    expect(again.unreadable).toEqual(["0a27"]);
    expect(await ownTextOf("0a12")).toBe("gone \uFFFD");
    expect(await ownTextOf("0a27")).toBe("refused \uFFFD");
  });

  it("carries on reading garbled letters from where a refusal stopped it, reading none twice", async () => {
    await seed();
    await run();
    await garble("0a12", "first \uFFFD");
    await garble("0a27", "second \uFFFD");
    server.use(
      http.get(`${GMAIL}/messages/0a27`, () => HttpResponse.json({ error: { message: "Too many" } }, { status: 403 }), {
        once: true,
      }),
    );
    const stopped = await run();
    expect(stopped).toMatchObject({ stoppedBy: "gmail", finished: false, read: 1 });
    await garble("0a12", "first again \uFFFD");
    const after = await run();
    expect(after).toMatchObject({ finished: true, read: 1 });
    expect(await ownTextOf("0a12")).toBe("first again \uFFFD");
    expect(await ownTextOf("0a27")).toContain("of all people");
  });

  /** A repeat of Wendy's frontier AI form letter, at the moment Airtable has a record of one, to Polly. */
  const wendysRepeat = (id = "0a28", at = "2026-10-01T09:00:30Z") =>
    mailIs(
      id,
      "t-staffer",
      at,
      fromTheForm("Wendy Webform", "wendy.webform@example.com", "polly.placeholder.mp@parliament.uk"),
      Buffer.from("Dear Ms Placeholder,"),
    );
  const pollyInAirtable = (polly: number) =>
    query("UPDATE notable_people SET airtable_id = 'recPlaceholder' WHERE id = $1", [polly]);

  it("puts a supporter's repeat of their form letter on that letter, with one address, reading Airtable once", async () => {
    const { form, polly } = await seed();
    await pollyInAirtable(polly);
    wendysRepeat();
    // Someone Airtable has no record of, read in the same run.
    mailIs(
      "0a27",
      "t-wh-3",
      "2026-10-01T09:00:40Z",
      fromTheForm("Nell Nobody", "nell.nobody@example.com", "polly.placeholder.mp@parliament.uk"),
      Buffer.from("Dear Ms Placeholder,"),
    );
    const result = await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "joined", letterId: form });
    expect(result.joined["pauseai-info-frontier-ai"]).toBe(2);
    const sends = await query<{ from: string; purpose: string }>(
      `SELECT from_address AS from, purpose FROM email_sends WHERE letter_id = $1 AND message_id = '0a28'`,
      [form],
    );
    expect(sends).toEqual([{ from: "wendy.webform@example.com", purpose: "letter" }]);
    expect(await outcomeOf("0a27")).toEqual({ outcome: "one_off", letterId: null });
  });

  it("puts a repeat on the letter of the campaign Airtable says, of a supporter's letters in two", async () => {
    const { form, polly } = await seed();
    await pollyInAirtable(polly);
    await query("UPDATE letters_from_supporters SET campaign = 'pauseai-info-liability' WHERE id = $1", [form]);
    const frontier = await addTestLetter({
      politicianId: polly,
      campaign: "pauseai-info-frontier-ai",
      senderName: "Wendy Webform",
      senderEmail: "wendy.webform@example.com",
    });
    await query("UPDATE letters_from_supporters SET airtable_id = 'recOther', postmark_mailbox = NULL WHERE id = $1", [
      frontier,
    ]);
    wendysRepeat();
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "joined", letterId: frontier });
  });

  it("keeps as a one-off a supporter's email Airtable has no record of at that time", async () => {
    const { polly } = await seed();
    await pollyInAirtable(polly);
    wendysRepeat("0a28", "2026-10-09T09:00:00Z");
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "one_off", letterId: null });
  });

  it("keeps as a one-off a repeat Airtable marks as spam, though the supporter has a letter", async () => {
    const { polly } = await seed();
    await pollyInAirtable(polly);
    server.use(
      http.get("https://api.airtable.com/v0/:base/tblkzjrRHiZiqMDGR", () =>
        HttpResponse.json({
          records: webForm.records.map((record) =>
            record.id === "recWebWendyAgain" ? { ...record, fields: { ...record.fields, Spam: true } } : record,
          ),
        }),
      ),
    );
    wendysRepeat();
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "one_off", letterId: null });
  });

  it("keeps as a one-off a repeat to a politician Airtable's record isn't to", async () => {
    const { polly, dora } = await seed();
    await pollyInAirtable(polly);
    await addTestLetter({
      politicianId: dora,
      campaign: "pauseai-info-frontier-ai",
      senderName: "Wendy Webform",
      senderEmail: "wendy.webform@example.com",
    });
    mailIs(
      "0a28",
      "t-staffer",
      "2026-10-01T09:00:30Z",
      fromTheForm("Wendy Webform", "wendy.webform@example.com", "mp90001.office@parliament.uk"),
      Buffer.from("Dear Ms Dummy,"),
    );
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "one_off", letterId: null });
  });

  it("keeps a stranger's email to a politician as a one-off, though its subject is a mailing's", async () => {
    await seed();
    mailIs(
      "0a28",
      "t-staffer",
      "2026-10-01T09:00:00Z",
      fromTheForm("Nell Nobody", "nell.nobody@example.com", "polly.placeholder.mp@parliament.uk"),
      Buffer.from("Dear Ms Placeholder,"),
    );
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "one_off", letterId: null });
    const [{ from }] = await query<{ from: string }>(
      "SELECT from_address AS from FROM one_off_messages WHERE gmail_message_id = '0a28'",
    );
    expect(from).toBe("nell.nobody@example.com");
  });

  it("puts a reply of ours on the letter its subject and politician say, though it's in no thread of the letter", async () => {
    const { deepmind } = await seed();
    mailIs(
      "0a28",
      "t-staffer",
      "2025-07-20T09:00:00Z",
      {
        From: "Joseph Example <joseph@pauseai.info>",
        To: "polly.placeholder.mp@parliament.uk",
        Subject: "Re: Request to co-sign letter on Google's breach of AI safety pledges",
        "Message-ID": "<0a28@mail.gmail.com>",
        "Content-Type": "text/plain; charset=utf-8",
      },
      Buffer.from("Thank you for your answer."),
    );
    await run();
    expect(await outcomeOf("0a28")).toEqual({ outcome: "reply", letterId: deepmind });
  });

  it("moves a reply of ours kept as a one-off to its letter, its stored mail with it, and its thread if that's all there was", async () => {
    const { deepmind } = await seed();
    await run();
    const subject = "Re: Request to co-sign letter on Google's breach of AI safety pledges";
    await query(
      `UPDATE one_off_messages SET subject = $1, from_us = true, addresses = ARRAY['polly.placeholder.mp@parliament.uk'], at = '2025-07-20T09:00:00Z' WHERE gmail_message_id = '0a28'`,
      [subject],
    );
    const [{ threadId, blob }] = await query<{ threadId: number; blob: string }>(
      `SELECT thread_id::int AS "threadId", blob_key AS blob FROM one_off_messages WHERE gmail_message_id = '0a28'`,
    );
    await query("DELETE FROM one_off_messages WHERE thread_id = $1 AND gmail_message_id <> '0a28'", [threadId]);
    // A reply nothing answers stays where it is.
    await query("UPDATE one_off_messages SET subject = 'Re: Coffee next week?' WHERE gmail_message_id = '0a13'");
    const again = await run();
    expect(again.read).toBe(0);
    expect(await outcomeOf("0a28")).toEqual({ outcome: "reply", letterId: deepmind });
    expect(await query("SELECT 1 FROM one_off_messages WHERE gmail_message_id = '0a28'")).toEqual([]);
    expect(await query("SELECT 1 FROM one_off_threads WHERE id = $1", [threadId])).toEqual([]);
    const replies = await query<{ blob: string; fromUs: boolean }>(
      `SELECT blob_key AS blob, from_us AS "fromUs" FROM letter_replies WHERE gmail_message_id = '0a28' AND letter_id = $1`,
      [deepmind],
    );
    expect(replies).toEqual([{ blob, fromUs: true }]);
    expect((await outcomeOf("0a13")).outcome).toBe("one_off");
  });

  it("reads again, as what it is, an email kept as PauseAI's letter though a supporter sent it, with what joined that letter", async () => {
    await seed();
    await run();
    const [{ letterId }] = await query<{ letterId: number }>(
      "SELECT letter_id::int AS \"letterId\" FROM old_letters_mail WHERE gmail_message_id = '0a12'",
    );
    await query(
      "UPDATE email_sends SET from_address = 'nell.nobody@example.com, info@pauseai.info' WHERE letter_id = $1",
      [letterId],
    );
    await query("UPDATE old_letters_mail SET letter_id = $1 WHERE gmail_message_id = '0a23'", [letterId]);
    mailIs(
      "0a12",
      "t-russell",
      "2026-07-01T09:00:00Z",
      fromTheForm("Nell Nobody", "nell.nobody@example.com", "mp90003.office@parliament.uk"),
      Buffer.from("Dear Mx Example,"),
    );
    const again = await run();
    expect(again.read).toBe(2);
    expect(await outcomeOf("0a12")).toEqual({ outcome: "one_off", letterId: null });
    expect(await query("SELECT 1 FROM letters WHERE id = $1", [letterId])).toEqual([]);
    expect(await query("SELECT 1 FROM email_sends WHERE letter_id = $1 OR message_id = '0a12'", [letterId])).toEqual(
      [],
    );
  });

  it("keeps only the first of two addresses a send has", async () => {
    const seeded = await seed();
    await run();
    await query(
      "UPDATE email_sends SET from_address = 'wendy.webform@example.com, info@pauseai.info' WHERE letter_id = $1",
      [seeded.form],
    );
    await run();
    const [{ from }] = await query<{ from: string }>(
      "SELECT from_address AS from FROM email_sends WHERE letter_id = $1",
      [seeded.form],
    );
    expect(from).toBe("wendy.webform@example.com");
  });

  it("notes a message Gmail won't give, and goes on", async () => {
    await seed();
    server.use(http.get(`${GMAIL}/messages/0a13`, () => new HttpResponse("{}", { status: 400 })));
    const { unreadable, finished } = await run();
    expect(unreadable).toEqual(["0a13"]);
    expect(finished).toBe(true);
    // Under a fixed sentence, so a run with a different number is no new problem.
    expect((await latestRun("import-old-letters"))?.problems).toContainEqual({
      what: staffCopy.problems.job.unreadable,
      error: "0a13",
    });
  });

  it("keeps a letter that doesn't fit its mailing's text whole, where most do", async () => {
    await seed();
    const { ownText } = await run();
    expect(ownText).toBeGreaterThan(0);
    const rows = await query<{ text: string | null; greeting: string | null }>(
      `SELECT p.own_text AS text, p.merge_values->'values'->>'greeting' AS greeting FROM old_letters_mail o JOIN letters_from_pauseai p ON p.id = o.letter_id
       WHERE o.gmail_message_id IN ('0a25', '0a27') ORDER BY o.gmail_message_id`,
    );
    expect(rows).toEqual([
      { text: null, greeting: "Dear Polly," },
      { text: expect.stringContaining("of all people"), greeting: null },
    ]);
  });

  it("keeps a mailing's template when pressed again, though only the letters that didn't fit have their text", async () => {
    await seed();
    await run();
    const templates = () => query("SELECT old_letters_key AS key, imported_text AS text FROM mailings ORDER BY id");
    const before = await templates();
    await run();
    expect(await templates()).toEqual(before);
  });

  it("says how far it has got, over all its runs", async () => {
    expect(await jobProgress("import-luma")).toBeUndefined();
    expect(await jobProgress("import-old-letters")).toMatchObject({ read: 0, left: 0, refusals: 0, byMailing: {} });
    await seed();
    await run();
    const progress = await jobProgress("import-old-letters");
    expect(progress).toMatchObject({ left: 0, refusals: 0 });
    expect(progress!.read).toBeGreaterThan(0);
    expect(progress!.joined).toBeGreaterThan(0);
    expect(progress!.replies).toBeGreaterThan(0);
    expect(progress!.oneOffs).toBeGreaterThan(0);
    expect(progress!.byMailing).toMatchObject({ "deepmind-25": 2, csrb: 1, "pauseai-info-frontier-ai": 1 });
    expect(progress!.titles["deepmind-25"]).toBe(staffCopy.oldLetters.mailingTitles["deepmind-25"]);
    await query(
      `INSERT INTO import_runs (job, started_by, status, result) VALUES ('import-old-letters', 'nightly', 'ok', '{"stoppedBy":"gmail"}')`,
    );
    expect((await jobProgress("import-old-letters"))?.refusals).toBe(1);
  });

  it("skips what's kept when pressed again", async () => {
    await seed();
    await run();
    const count = async () =>
      (
        await query<{ sends: number; replies: number; oneOffs: number; letters: number }>(
          `SELECT (SELECT count(*)::int FROM email_sends) AS sends, (SELECT count(*)::int FROM letter_replies) AS replies,
             (SELECT count(*)::int FROM one_off_messages) AS "oneOffs", (SELECT count(*)::int FROM letters) AS letters`,
        )
      )[0];
    const before = await count();
    const again = await run();
    expect(again.read).toBe(0);
    expect(await count()).toEqual(before);
  });

  it("reports what it joined, by mailing", async () => {
    const seeded = await seed();
    const result = await run();
    expect(result).toMatchObject({ finished: true, formTexts: 1 });
    expect(result.joined).toMatchObject({ "deepmind-25": 1, csrb: 1, "pauseai-info-frontier-ai": 1 });
    expect(result.added["russell-speak"]).toBe(1);
    expect(result.replies).toBeGreaterThan(0);
    expect(result.notJoined["deepmind-others"]).toBeGreaterThan(0);
    expect((await outcomeOf("0a01")).letterId).toBe(seeded.deepmind);
  });

  it("stops the moment Gmail refuses, saying so, and carries on when pressed again", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    server.use(
      http.get(`${GMAIL}/messages/0a02`, () => HttpResponse.json({ error: { message: "Too many" } }, { status: 403 }), {
        once: true,
      }),
    );
    const stopped = await importOldLetters("jo@pauseai.uk", 0);
    expect(stopped).toMatchObject({
      stoppedBy: "gmail",
      stoppedWhy: "Gmail answered 403 for /messages/0a02: Too many",
      finished: false,
    });
    expect(stopped.left).toBeGreaterThan(0);
    const again = await importOldLetters("jo@pauseai.uk", 0);
    expect(again).toMatchObject({ finished: true, left: 0, listed: 0 });
  });

  it("carries on from where the last run stopped when its time is up, without listing again", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    let last = await importOldLetters("jo@pauseai.uk", 0, 40);
    let runs = 1;
    while (!last.finished) {
      last = await importOldLetters("jo@pauseai.uk", 0, 40);
      runs++;
    }
    expect(runs).toBeGreaterThan(1);
    expect(await query("SELECT 1 FROM import_runs WHERE job = 'import-old-letters'")).toHaveLength(runs);
    expect(last.left).toBe(0);
  });

  it("does nothing on its schedule once finished, while a press goes through it all again", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    const runs = () => query("SELECT 1 FROM import_runs WHERE job = 'import-old-letters'");
    await expect(importOldLetters(NIGHTLY, 0, 60_000)).resolves.toMatchObject({ finished: true });
    expect(await runs()).toHaveLength(1);
    await expect(importOldLetters(NIGHTLY, 0, 60_000)).resolves.toMatchObject({ finished: true });
    expect(await runs()).toHaveLength(1);
    await expect(importOldLetters("jo@pauseai.uk", 0)).resolves.toMatchObject({ finished: true, read: 0 });
    expect(await runs()).toHaveLength(2);
  });

  it("stops at once, leaving no record, while another run is going", async () => {
    const result = await transaction(async (db) => {
      await query("SELECT pg_advisory_xact_lock(hashtext('import-old-letters'))", [], db);
      return importOldLetters("jo@pauseai.uk", 0);
    });
    expect(result).toMatchObject({ finished: false, read: 0 });
    expect(await query("SELECT 1 FROM import_runs WHERE job = 'import-old-letters'")).toEqual([]);
  });

  it("keeps a failure in the import log", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await expect(importOldLetters("jo@pauseai.uk", 0)).rejects.toThrow("isn't connected");
    const [{ status }] = await query<{ status: string }>(
      "SELECT status FROM import_runs WHERE job = 'import-old-letters'",
    );
    expect(status).toBe("failed");
  });

  it("fails on anything else Gmail says", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    server.use(http.get(`${GMAIL}/messages/0a01`, () => new HttpResponse("{}", { status: 500 }), { once: true }));
    await expect(importOldLetters("jo@pauseai.uk", 0)).rejects.toThrow("Gmail answered 500");
  });

  it("skips a message gone between reading its headers and the whole of it, wherever that happens", async () => {
    const { dora } = await seed();
    // A letter Postmark sent, so its Bcc'd copy is read whole for its text.
    const letter = await addTestLetter({ politicianId: dora, senderEmail: "pm@example.com" });
    await query(
      `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES ('letter', $1, 'x@parliament.uk', 'sent', 'fixture-postmark-1')`,
      [letter],
    );
    // One of each kind read whole after its headers: a one-off sent, a person's reply, a Postmark copy, shared mail
    // checked for who it quotes, and a message of a kept thread.
    const gone = new Set(["0a13", "0a03", "0b03", "0a17", "0a20"]);
    server.use(
      http.get(`${GMAIL}/messages/:id`, ({ request, params }) => {
        const raw = new URL(request.url).searchParams.get("format") === "raw";
        return raw && gone.has(String(params.id)) ? new HttpResponse(null, { status: 404 }) : undefined;
      }),
    );
    const result = await run();
    expect(result.finished).toBe(true);
    for (const id of gone) expect((await outcomeOf(id)).outcome).toBe("skipped");
  });

  it("skips mail gone since it was listed", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    server.use(
      http.get(`${GMAIL}/messages/0a01`, () => new HttpResponse("{}", { status: 404 }), { once: true }),
      http.get(`${GMAIL}/messages/0a10`, () => new HttpResponse("{}", { status: 404 }), { once: true }),
      http.get(`${GMAIL}/messages/0a14`, () => new HttpResponse("{}", { status: 404 })),
      http.get(`${GMAIL}/messages/0a20`, () => new HttpResponse("{}", { status: 404 })),
    );
    await importOldLetters("jo@pauseai.uk", 0);
    expect((await outcomeOf("0a01")).outcome).toBe("skipped");
    expect((await outcomeOf("0a10")).outcome).toBe("skipped");
  });
});

it("searches parliaments' domains, a politician's own, and addresses on neither a few at a time", () => {
  const addresses = new Map(Array.from({ length: 31 }, (_, i): [string, number[]] => [`mp${i}@gmail.com`, [i]]));
  addresses.set("a@parliament.uk", [99]);
  addresses.set("b@x.parliament.uk", [99]);
  const book = { addresses, domains: new Map([["tulip.example", 1]]) };
  const sent = politicianSearches(book, "sent");
  expect(sent).toHaveLength(3);
  expect(sent[0]).toContain("to:parliament.uk cc:parliament.uk");
  expect(sent[0]).toContain("to:tulip.example");
  expect(sent[1]).toContain("to:mp0@gmail.com");
  expect(sent[1]).not.toContain("a@parliament.uk");
  expect(politicianSearches(book, "received")[0]).toMatch(/^-in:sent \{from:parliament\.uk/);
});
