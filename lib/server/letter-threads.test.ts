import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { letterThread, messageText, replyFile, repliesAfter } from "./letter-threads";
import { saveLetterReply } from "./outside-services/blobs";

const LETTER = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Dear " },
        { type: "field", attrs: { field: "salutation" } },
      ],
    },
  ],
};

describeWithDatabase("letter threads", () => {
  useTestDatabase();
  beforeEach(() => vi.stubEnv("DATA_FIXTURES", "1"));
  afterEach(() => vi.unstubAllEnvs());

  /** A mailing sent from Jo's Gmail, its letter to Polly, and the letter's ID; or with `imported`, one from Airtable. */
  async function letter(imported = false): Promise<{ mailing: number; letter: number; polly: number }> {
    const polly = await addTestPolitician();
    const [{ id: mailing }] = imported
      ? await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE body IS NULL ORDER BY id LIMIT 1")
      : await query<{ id: number }>(
          `INSERT INTO mailings (title, subject, audience, channel, filter, body, created_by, sent_from, from_name, due_at, state)
           VALUES ('AI', 'AI safety', 'politicians', 'email', '{"list": "politicians", "params": {}}', $1, 'jo@pauseai.uk',
             'jo@pauseai.uk', 'Jo Staff', now(), 'sent') RETURNING id::int AS id`,
          [JSON.stringify(LETTER)],
        );
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', '2026-11-02T10:00:00Z') RETURNING id::int AS id",
      [polly],
    );
    await query("INSERT INTO letters_from_pauseai (id, mailing_id, merge_values) VALUES ($1, $2, $3)", [
      id,
      mailing,
      imported ? null : JSON.stringify({ values: { salutation: "Ms Placeholder" }, meets: [] }),
    ]);
    return { mailing, letter: id, polly };
  }

  async function keep(letterId: number, key: string, raw: string | null, at: string, fromUs = false) {
    if (raw !== null) await saveLetterReply(key, gzipSync(Buffer.from(raw, "latin1")));
    await query(
      `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, from_address, from_name, subject, at,
         from_us, blob_key, size)
       VALUES ($1, 'jo@pauseai.uk', $2, 't1', 'polly@example.org', 'Polly', 'Re: AI safety', $3, $4, $2, 1)`,
      [letterId, key, at, fromUs],
    );
  }

  it("gives the letter as it went, its Gmail thread, what happened to it, and each reply's text, oldest first", async () => {
    const { mailing, letter: id, polly } = await letter();
    await query(
      `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id, backend, sender, gmail_thread_id)
       VALUES ('mailing', $1, 'p@example.org', 'sent', 'g1', 'gmail', 'jo@pauseai.uk', 'thread-1')`,
      [id],
    );
    await query(
      "INSERT INTO letter_events (letter_id, status, at) VALUES ($1, 'sent', now()), ($1, 'auto_reply', '2026-11-02T10:01:00Z')",
      [id],
    );
    await keep(
      id,
      "b.eml.gz",
      "Content-Type: text/html\r\n\r\n<p>Ours &amp; <b>yours</b></p><style>p{}</style>",
      "2026-11-03T10:00:00Z",
      true,
    );
    await keep(id, "a.eml.gz", "Subject: Re\r\n\r\nThanks,\r\nPolly\r\n", "2026-11-02T12:00:00Z");
    expect(await letterThread(mailing, id)).toEqual({
      letterId: id,
      mailingId: mailing,
      mailingTitle: "AI",
      politician: { id: polly, name: "Polly Placeholder", email: "polly.placeholder.mp@parliament.uk" },
      status: "sent",
      sentAt: new Date("2026-11-02T10:00:00Z"),
      subject: "AI safety",
      letter: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Dear " },
              { type: "text", text: "Ms Placeholder" },
            ],
          },
        ],
      },
      sentFrom: "jo@pauseai.uk",
      fromName: "Jo Staff",
      gmailThreadId: "thread-1",
      events: [{ at: new Date("2026-11-02T10:01:00Z"), status: "auto_reply" }],
      messages: [
        expect.objectContaining({ fromName: "Polly", fromUs: false, text: "Thanks,\nPolly" }),
        expect.objectContaining({ fromUs: true, text: "Ours & yours" }),
      ],
    });
    expect(await letterThread(mailing, id + 1)).toBeUndefined();
  });

  it("gives an imported letter no text, and a message with no text, or gone, none either", async () => {
    const { mailing, letter: id } = await letter(true);
    await keep(id, "gone.eml.gz", null, "2026-11-02T12:00:00Z");
    expect(await letterThread(mailing, id)).toMatchObject({
      letter: null,
      gmailThreadId: null,
      messages: [{ text: null }],
    });
    await saveLetterReply("pdf.eml.gz", gzipSync("Content-Type: application/pdf\r\n\r\n%PDF"));
    expect(await messageText("pdf.eml.gz")).toBeNull();
  });

  it("lists the kept replies after an ID for the backup, and gives each one's file", async () => {
    const { letter: id } = await letter();
    await keep(id, "a.eml.gz", "hello", "2026-11-02T12:00:00Z");
    await keep(id, "b.eml.gz", "again", "2026-11-02T13:00:00Z");
    const [first, second] = await repliesAfter(0);
    expect([first.key, second.key]).toEqual(["a.eml.gz", "b.eml.gz"]);
    expect(await repliesAfter(first.id)).toEqual([second]);
    expect(await repliesAfter(0, 1)).toEqual([first]);
    expect((await replyFile(second.id))!.equals(gzipSync(Buffer.from("again")))).toBe(true);
    expect(await replyFile(999)).toBeUndefined();
  });
});
