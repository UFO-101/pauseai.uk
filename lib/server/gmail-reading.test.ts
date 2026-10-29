import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { NIGHTLY } from "@/lib/import-runs";
import { addTestPolitician, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { readBounce, readGmail } from "./gmail-reading";
import { listRuns } from "./import-runs";
import { letterReply } from "./outside-services/blobs";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const JO = "jo@pauseai.uk";
const REQUEST = new Request("https://pauseai.uk/api/cron/read-gmail", { method: "POST" });
/** What the hourly job's read of every account found. */
const read = async () => (await readGmail(NIGHTLY, REQUEST)).accounts;
const fixture = (name: string) => readFileSync(join(process.cwd(), "tests/fixtures/gmail", name), "latin1");

describe("readBounce", () => {
  it("reads Gmail's own bounce: the address from its report, and the letter from the copy it carries", () => {
    expect(readBounce(fixture("gmail-hard-bounce.eml"))).toEqual({
      addresses: [
        {
          address: "gone@example.org",
          status: "5.1.1",
          reason: "550 5.1.1 The email account that you tried to reach does not exist.",
          delayed: false,
        },
      ],
      messageId: "letter-1@pauseai.uk",
    });
  });

  it("reads another server's delay, from its original recipient, and the letter from the headers it carries", () => {
    expect(readBounce(fixture("other-server-delay.eml"))).toEqual({
      addresses: [{ address: "full@example.net", status: "4.2.2", reason: "4.2.2", delayed: true }],
      messageId: "letter-2@pauseai.uk",
    });
  });

  it("falls back on X-Failed-Recipients, and on what the bounce answers", () => {
    expect(readBounce(fixture("bare-bounce.eml"))).toEqual({
      addresses: [
        { address: "a@example.com", status: "", reason: "", delayed: false },
        { address: "b@example.com", status: "", reason: "", delayed: false },
      ],
      messageId: "letter-3@pauseai.uk",
    });
    expect(readBounce("Subject: nothing\r\n\r\nNo report.")).toEqual({ addresses: [], messageId: undefined });
    // A report's block with no action is passed over; one failed with no status is still a failure.
    const report = [
      'Content-Type: multipart/report; boundary="b"',
      "",
      "--b",
      "Content-Type: message/delivery-status",
      "",
      "Final-Recipient: rfc822; quiet@example.org",
      "",
      "Final-Recipient: rfc822; failed@example.org",
      "Action: failed",
      "--b--",
    ].join("\r\n");
    expect(readBounce(report).addresses).toEqual([
      { address: "failed@example.org", status: "", reason: "", delayed: false },
    ]);
  });
});

/** A message in the fake mailbox: its headers, its whole text, and its thread. */
type Message = { headers: Record<string, string>; raw?: string; threadId?: string; internalDate?: string };

/**
 * A fake Gmail for every account: `history` lists what arrived since the
 * last read, or null for history that's gone; `search` what each query
 * finds; `messages` each message by ID.
 */
function mailbox({
  history = [] as string[] | null,
  search = {} as Record<string, string[]>,
  messages = {} as Record<string, Message>,
}) {
  const fetched: string[] = [];
  server.use(
    http.get(`${API}/history`, () =>
      history === null
        ? new HttpResponse(null, { status: 404 })
        : HttpResponse.json({
            history: [{ messagesAdded: history.map((id) => ({ message: { id } })) }],
            historyId: "2000",
          }),
    ),
    http.get(`${API}/messages`, ({ request }) =>
      HttpResponse.json({
        messages: (search[new URL(request.url).searchParams.get("q")!] ?? []).map((id) => ({ id })),
      }),
    ),
    http.get(`${API}/messages/:id`, ({ request, params }) => {
      const id = String(params.id);
      const message = messages[id];
      const format = new URL(request.url).searchParams.get("format");
      fetched.push(`${id}:${format}`);
      if (format === "raw")
        return HttpResponse.json({ raw: Buffer.from(message.raw ?? "", "latin1").toString("base64url") });
      return HttpResponse.json({
        id,
        threadId: message.threadId ?? `thread-${id}`,
        internalDate: message.internalDate ?? String(Date.parse("2026-11-02T10:00:00Z")),
        payload: { headers: Object.entries(message.headers).map(([name, value]) => ({ name, value })) },
      });
    }),
  );
  return fetched;
}

const BOUNCE_SEARCH = "from:mailer-daemon OR from:postmaster newer_than:3d";

describeWithDatabase("reading Gmail", () => {
  useTestDatabase();
  beforeEach(() => {
    vi.stubEnv(
      "NETLIFY_BLOBS_CONTEXT",
      Buffer.from(JSON.stringify({ edgeURL: "https://blobs.fixture.invalid", siteID: "fixture", token: "t" })).toString(
        "base64",
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  /** A letter of a mailing sent from Jo's Gmail to Polly, with its Message-ID and thread. Returns its ID. */
  async function sentLetter(n = 1, email = "polly@example.org"): Promise<number> {
    const politician = await addTestPolitician({ airtableId: null, name: `Polly ${n}`, email });
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', now()) RETURNING id::int AS id",
      [politician],
    );
    await query(
      `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id, backend, sender, rfc_message_id, gmail_thread_id)
       VALUES ('mailing', $1, $2, 'sent', $3, 'gmail', $4, $5, $6)`,
      [id, email, `g-letter-${n}`, JO, `letter-${n}@pauseai.uk`, `t${n}`],
    );
    return id;
  }

  const replies = () =>
    query(
      `SELECT letter_id::int AS "letterId", gmail_message_id AS id, from_address AS "from", from_name AS name, from_us AS "fromUs",
         rfc_message_id AS rfc, subject, blob_key AS key FROM letter_replies ORDER BY letter_replies.id`,
    );
  const events = () => query('SELECT letter_id::int AS "letterId", status, details FROM letter_events ORDER BY id');

  it("keeps a politician's reply whole and marks the letter replied to; keeps our answer, but not as a reply", async () => {
    await connectTestGmail(JO, "1000");
    const letter = await sentLetter();
    const reply = "From: Polly <Polly@example.org>\r\nSubject: Re: AI\r\nMessage-ID: <r1@example.org>\r\n\r\nThanks.";
    const fetched = mailbox({
      history: ["r1", "a1"],
      messages: {
        r1: {
          headers: {
            From: "Polly <Polly@example.org>",
            Subject: "Re: AI",
            "Message-ID": "<r1@example.org>",
            "In-Reply-To": "<letter-1@pauseai.uk>",
          },
          raw: reply,
        },
        a1: {
          headers: { From: JO, References: "<letter-1@pauseai.uk> <r1@example.org>" },
          raw: "Subject: x\r\n\r\nGlad.",
        },
      },
    });
    expect(await read()).toEqual([{ account: JO, replies: 2, autoReplies: 0, bounces: 0 }]);
    expect(await replies()).toEqual([
      {
        letterId: letter,
        id: "r1",
        from: "polly@example.org",
        name: "Polly",
        fromUs: false,
        rfc: "r1@example.org",
        subject: "Re: AI",
        key: `${JO}/r1.eml.gz`,
      },
      { letterId: letter, id: "a1", from: JO, name: "", fromUs: true, rfc: null, subject: "", key: `${JO}/a1.eml.gz` },
    ]);
    expect(gunzipSync((await letterReply(`${JO}/r1.eml.gz`))!).toString()).toBe(reply);
    expect(await query("SELECT replied_at FROM letters")).toEqual([{ replied_at: new Date("2026-11-02T10:00:00Z") }]);
    expect(await events()).toEqual([
      {
        letterId: letter,
        status: "replied",
        details: { from: "polly@example.org", name: "Polly", gmailMessageId: "r1" },
      },
    ]);
    expect(await query("SELECT gmail_history_id FROM staff_accounts")).toEqual([{ gmail_history_id: "2000" }]);
    // Only the headers of each, then the two kept, whole.
    expect(fetched).toEqual(["r1:metadata", "r1:raw", "a1:metadata", "a1:raw"]);

    // Read again, nothing is kept twice.
    expect(await read()).toEqual([{ account: JO, replies: 0, autoReplies: 0, bounces: 0 }]);
    expect(await replies()).toHaveLength(2);
  });

  it("finds the letter by its thread when a reply names nothing: ours, or one a kept message is in", async () => {
    await connectTestGmail(JO);
    const one = await sentLetter(1);
    const two = await sentLetter(2, "dora@example.org");
    await query(
      `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, from_address, at, from_us, blob_key, size)
       VALUES ($1, $2, 'old', 'kept-thread', 'dora@example.org', now(), false, 'k', 1)`,
      [two, JO],
    );
    mailbox({
      history: ["x1", "x2", "x3"],
      messages: {
        x1: { headers: { From: "polly@example.org" }, threadId: "t1", raw: "a" },
        x2: { headers: { From: "dora@example.org" }, threadId: "kept-thread", raw: "b" },
        x3: { headers: { From: "nobody@example.org", "Message-ID": "<x3@example.org>" }, threadId: "elsewhere" },
      },
    });
    expect(await read()).toMatchObject([{ replies: 2 }]);
    expect((await replies()).map((r) => [r.id, r.letterId])).toEqual([
      ["old", two],
      ["x1", one],
      ["x2", two],
    ]);
  });

  it("leaves alone the letter itself, in Sent, and notes an automatic reply once", async () => {
    await connectTestGmail(JO);
    const letter = await sentLetter();
    const fetched = mailbox({
      history: ["sent", "ooo"],
      messages: {
        sent: { headers: { From: JO, "Message-ID": "<letter-1@pauseai.uk>" }, threadId: "t1" },
        ooo: {
          headers: {
            From: "polly@example.org",
            "Auto-Submitted": "auto-replied",
            "In-Reply-To": "<letter-1@pauseai.uk>",
          },
        },
      },
    });
    expect(await read()).toMatchObject([{ replies: 0, autoReplies: 1 }]);
    expect(await read()).toMatchObject([{ autoReplies: 0 }]);
    expect(await events()).toEqual([
      { letterId: letter, status: "auto_reply", details: { from: "polly@example.org", gmailMessageId: "ooo" } },
    ]);
    expect(await replies()).toEqual([]);
    expect(fetched.filter((one) => one.endsWith(":raw"))).toEqual([]);
  });

  it("records a bounce as Postmark's, on the letter it was, once; and finds another server's by searching", async () => {
    await connectTestGmail(JO);
    const letter = await sentLetter(1, "gone@example.org");
    await sentLetter(2, "full@example.net");
    mailbox({
      history: ["b1"],
      search: { [BOUNCE_SEARCH]: ["b1", "b2", "b3"] },
      messages: {
        b1: {
          headers: { From: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>" },
          raw: fixture("gmail-hard-bounce.eml"),
        },
        b2: {
          headers: { From: "postmaster@example.net", Subject: "Undeliverable" },
          raw: fixture("other-server-delay.eml"),
        },
        b3: {
          headers: { From: "MAILER-DAEMON@example.com" },
          raw: "Subject: x\r\nX-Failed-Recipients: c@example.com\r\n\r\n?",
        },
      },
    });
    expect(await read()).toMatchObject([{ bounces: 3 }]);
    expect(
      await query("SELECT address, message_id, kind, reason, gmail_message_id FROM email_problems ORDER BY id"),
    ).toEqual([
      {
        address: "gone@example.org",
        message_id: "g-letter-1",
        kind: "hard",
        reason: "550 5.1.1 The email account that you tried to reach does not exist.",
        gmail_message_id: "b1",
      },
      { address: "full@example.net", message_id: "g-letter-2", kind: "soft", reason: "4.2.2", gmail_message_id: "b2" },
      { address: "c@example.com", message_id: null, kind: "hard", reason: "", gmail_message_id: "b3" },
    ]);
    expect(await query("SELECT address FROM email_blocks ORDER BY address")).toEqual([
      { address: "c@example.com" },
      { address: "gone@example.org" },
    ]);
    expect(await query("SELECT status FROM letters WHERE id = $1", [letter])).toEqual([{ status: "bounced" }]);
    // The search finds them again tomorrow; they're recorded once.
    expect(await read()).toMatchObject([{ bounces: 0 }]);
    expect(await query("SELECT 1 FROM email_problems")).toHaveLength(3);
  });

  it("says why when a bounce gives nothing to go on", async () => {
    await connectTestGmail(JO);
    mailbox({
      history: ["b1"],
      messages: { b1: { headers: { From: "postmaster@example.net" }, raw: "Subject: hm\r\n\r\nNothing." } },
    });
    expect(await read()).toMatchObject([{ bounces: 0 }]);
  });

  it("searches the last few days when the mailbox's history has gone, and starts again from now", async () => {
    await connectTestGmail(JO, "5");
    await sentLetter();
    mailbox({
      history: null,
      search: { "newer_than:3d": ["r1"] },
      messages: { r1: { headers: { From: "polly@example.org", "In-Reply-To": "<letter-1@pauseai.uk>" }, raw: "x" } },
    });
    expect(await read()).toEqual([{ account: JO, replies: 1, autoReplies: 0, bounces: 0, restarted: true }]);
    expect(await query("SELECT gmail_history_id FROM staff_accounts")).toEqual([{ gmail_history_id: "1000" }]);
  });

  it("reads each account, saying which failed and leaving where it got to", async () => {
    await connectTestGmail("al@pauseai.uk", "7");
    await connectTestGmail(JO, "8");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mailbox({});
    server.use(
      http.get(`${API}/history`, ({ request }) =>
        request.headers.get("authorization")!.endsWith("al@pauseai.uk")
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ historyId: "9" }),
      ),
    );
    expect(await read()).toEqual([
      {
        account: "al@pauseai.uk",
        replies: 0,
        autoReplies: 0,
        bounces: 0,
        error: "Error: Gmail answered 500 for /history",
      },
      { account: JO, replies: 0, autoReplies: 0, bounces: 0 },
    ]);
    expect(error).toHaveBeenCalledWith("Couldn't read al@pauseai.uk's Gmail:", expect.any(Error));
    expect(await query("SELECT email, gmail_history_id AS h FROM staff_accounts ORDER BY email")).toEqual([
      { email: "al@pauseai.uk", h: "7" },
      { email: JO, h: "9" },
    ]);
  });

  it("keeps each run in the import log, unchanged when it found nothing, and who started it", async () => {
    await connectTestGmail(JO);
    await sentLetter();
    mailbox({});
    await readGmail(JO);
    mailbox({
      history: ["r1"],
      messages: { r1: { headers: { From: "polly@example.org", "In-Reply-To": "<letter-1@pauseai.uk>" }, raw: "x" } },
    });
    await readGmail(NIGHTLY, REQUEST);
    expect(await listRuns("read-gmail")).toMatchObject([
      { status: "ok", startedBy: NIGHTLY, result: { accounts: [{ account: JO, replies: 1 }] } },
      { status: "unchanged", startedBy: JO, result: { accounts: [{ account: JO, replies: 0 }] } },
    ]);
  });
});
