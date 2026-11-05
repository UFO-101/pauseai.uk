import { staffCopy } from "@/lib/content/staff-interface";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import {
  addTestLetter,
  addTestPolitician,
  connectTestGmail,
  describeWithDatabase,
  useTestDatabase,
} from "@/tests/database";
import { stubLettersInboxEnv } from "@/tests/gmail-sends";
import { sentToday } from "./gmail-accounts";
import { query } from "./db";
import { importOldLetters, importOldLettersChunk, politicianSearches } from "./old-letters-import";
import { startOldLettersImport } from "./old-letters-start";

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
  return importOldLetters("jo@pauseai.uk");
}

const outcomeOf = async (id: string) =>
  (
    await query<{ outcome: string; letterId: number | null }>(
      `SELECT outcome, letter_id::int AS "letterId" FROM old_letters_mail WHERE gmail_message_id = $1`,
      [id],
    )
  )[0];

describeWithDatabase("the import of old letters", () => {
  useTestDatabase();
  beforeEach(() => {
    stubLettersInboxEnv();
    vi.stubEnv("GMAIL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("AIRTABLE_TOKEN", "fixture");
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
    await importOldLetters("jo@pauseai.uk");
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

  it("notes a message Gmail won't give, and goes on", async () => {
    await seed();
    server.use(http.get(`${GMAIL}/messages/0a13`, () => new HttpResponse("{}", { status: 400 })));
    const { unreadable, finished } = await run();
    expect(unreadable).toEqual(["0a13"]);
    expect(finished).toBe(true);
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
    const stopped = await importOldLetters("jo@pauseai.uk");
    expect(stopped).toMatchObject({
      stoppedBy: "gmail",
      stoppedWhy: "Gmail answered 403 for /messages/0a02: Too many",
      finished: false,
    });
    expect(stopped.left).toBeGreaterThan(0);
    const again = await importOldLetters("jo@pauseai.uk");
    expect(again).toMatchObject({ finished: true, left: 0 });
  });

  it("carries on through more calls when a press's time is up", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    const result = await importOldLetters("jo@pauseai.uk", 0, 40);
    expect(result).toMatchObject({ finished: true });
  });

  it("works in calls, each keeping its place in one run, when its time is up", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    const first = await importOldLettersChunk({ startedBy: "jo@pauseai.uk", paceMs: 1, chunkMs: 1 });
    expect(first.more).toBe(true);
    const second = await importOldLettersChunk({
      startedBy: "jo@pauseai.uk",
      runId: first.runId,
      paceMs: 1,
      chunkMs: 60_000,
    });
    expect(second).toMatchObject({ runId: first.runId, more: false });
    const runs = await query<{ finished: boolean }>(
      `SELECT (result->>'finished')::boolean AS finished FROM import_runs WHERE job = 'import-old-letters'`,
    );
    expect(runs).toEqual([{ finished: true }]);
  });

  it("keeps a failure in the import log", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await expect(importOldLetters("jo@pauseai.uk")).rejects.toThrow("isn't connected");
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
    await expect(importOldLetters("jo@pauseai.uk")).rejects.toThrow("Gmail answered 500");
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
    await importOldLetters("jo@pauseai.uk");
    expect((await outcomeOf("0a01")).outcome).toBe("skipped");
    expect((await outcomeOf("0a10")).outcome).toBe("skipped");
  });

  it("starts a press: the whole of it on a fixture build, or a background function", async () => {
    await seed();
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    vi.stubEnv("DATA_FIXTURES", "1");
    await startOldLettersImport("jo@pauseai.uk");
    expect(await query("SELECT 1 FROM import_runs WHERE job = 'import-old-letters'")).toHaveLength(1);
    vi.stubEnv("DATA_FIXTURES", "");
    vi.stubEnv("CRON_SECRET", "s3cret");
    let body: unknown;
    server.use(
      http.post("https://pauseai.uk/.netlify/functions/import-old-letters-background", async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 202 });
      }),
    );
    await startOldLettersImport("jo@pauseai.uk");
    expect(body).toEqual({ startedBy: "jo@pauseai.uk" });
    server.use(
      http.post(
        "https://pauseai.uk/.netlify/functions/import-old-letters-background",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(startOldLettersImport("jo@pauseai.uk")).rejects.toThrow("returned 500");
    expect(
      await query("SELECT status, started_by AS by FROM import_runs WHERE job = 'import-old-letters'"),
    ).toContainEqual({ status: "failed", by: "jo@pauseai.uk" });
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
