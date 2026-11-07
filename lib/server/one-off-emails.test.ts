import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import {
  addTestLetter,
  addTestPolitician,
  connectTestGmail,
  describeWithDatabase,
  useTestDatabase,
} from "@/tests/database";
import { staffCopy } from "@/lib/content/staff-interface";
import { stubLettersInboxEnv } from "@/tests/gmail-sends";
import { notifications } from "@/tests/notifications";
import { query } from "./db";
import { eraseSupporter } from "./erasure";
import { addFormEntry } from "./form-entries";
import { readGmail } from "./gmail-reading";
import {
  deleteOneOffBlobs,
  getOneOffThread,
  keepIfPoliticianThread,
  keepOneOff,
  ONE_OFF_HEADERS,
  oneOffInbox,
  politicianOneOffs,
  reportUnmatchedMail,
  supporterOneOffs,
} from "./one-off-emails";
import { gmailMessageHeaders, type GmailMessageHeaders } from "./outside-services/gmail";
import { politicianBook } from "./politician-book";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const POLLY = "polly.placeholder.mp@parliament.uk";

type Mail = {
  id: string;
  thread?: string;
  from: string;
  to?: string;
  subject?: string;
  rfc?: string;
  inReplyTo?: string;
  list?: string;
  labels?: string[];
  text?: string;
};

/** A message in the mailbox being read, by the fake Gmail, its headers and whole. */
function mailbox(...mails: Mail[]) {
  const headersOf = (mail: Mail) => [
    { name: "From", value: mail.from },
    { name: "To", value: mail.to ?? "policy@pauseai.uk" },
    { name: "Subject", value: mail.subject ?? "A thread" },
    ...(mail.rfc === undefined ? [{ name: "Message-ID", value: `<${mail.id}@example.org>` }] : []),
    ...(mail.inReplyTo ? [{ name: "In-Reply-To", value: `<${mail.inReplyTo}>` }] : []),
    ...(mail.list ? [{ name: "List-Id", value: mail.list }] : []),
  ];
  for (const mail of mails) {
    server.use(
      http.get(`${GMAIL}/messages/${mail.id}`, ({ request }) => {
        const url = new URL(request.url);
        const base = {
          id: mail.id,
          threadId: mail.thread ?? `t-${mail.id}`,
          labelIds: mail.labels ?? ["INBOX"],
          internalDate: "1790000000000",
        };
        if (url.searchParams.get("format") === "raw") {
          const raw = `${headersOf(mail)
            .map((h) => `${h.name}: ${h.value}`)
            .join("\r\n")}\r\nContent-Type: text/plain\r\n\r\n${mail.text ?? "Hello"}`;
          return HttpResponse.json({ ...base, raw: Buffer.from(raw).toString("base64url") });
        }
        return HttpResponse.json({ ...base, payload: { headers: headersOf(mail) } });
      }),
    );
  }
}

/** The read's headers of a message, to keep directly. */
const headers = (mail: Mail & { at?: number }): GmailMessageHeaders => ({
  id: mail.id,
  threadId: mail.thread ?? `t-${mail.id}`,
  labelIds: [],
  internalDate: String(mail.at ?? 1790000000000),
  headers: new Map(
    Object.entries({
      from: mail.from,
      to: mail.to ?? "policy@pauseai.uk",
      subject: mail.subject ?? "A thread",
      ...(mail.rfc === undefined ? { "message-id": `<${mail.id}@example.org>` } : {}),
      ...(mail.inReplyTo ? { "in-reply-to": `<${mail.inReplyTo}>` } : {}),
    }),
  ),
});

const threads = () => query<{ id: number }>("SELECT id::int AS id FROM one_off_threads ORDER BY id");

async function keep(mail: Mail & { at?: number }, account = "policy@pauseai.uk", extra: number[] = []) {
  return keepOneOff(
    account,
    headers(mail),
    Buffer.from(`Subject: x\r\n\r\n${mail.text ?? "Hello"}`),
    await politicianBook(),
    ["policy@pauseai.uk"],
    extra,
  );
}

it("names the inbox one-off emails are copied to: POLICY_INBOX, or its usual address", () => {
  vi.stubEnv("POLICY_INBOX", "policy@example.org");
  expect(oneOffInbox()).toBe("policy@example.org");
  vi.stubEnv("POLICY_INBOX", "");
  expect(oneOffInbox()).toBe("policy@pauseai.uk");
  vi.unstubAllEnvs();
});

describeWithDatabase("one-off emails", () => {
  useTestDatabase();
  beforeEach(() => {
    stubLettersInboxEnv();
    vi.stubEnv("GMAIL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("keeps a message once, by its Message-ID across mailboxes and its Gmail ID within one", async () => {
    await addTestPolitician();
    const mail = { id: "a", from: `Polly <${POLLY}>` };
    expect(await keep(mail)).toBeGreaterThan(0);
    expect(await keep(mail)).toBeUndefined();
    expect(await keep({ ...mail, id: "elsewhere", rfc: undefined }, "joseph@pauseai.uk")).toBeGreaterThan(0);
    expect(await query("SELECT 1 FROM one_off_messages")).toHaveLength(2);
    expect(await keep({ id: "a", from: "x@example.com", rfc: "none" })).toBeUndefined();
  });

  it("doesn't keep a message that's a letter's own, its reply or its send, as a one-off too", async () => {
    const polly = await addTestPolitician();
    const letter = await addTestLetter({ politicianId: polly, senderEmail: "wendy@example.com" });
    await query(
      `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, from_address, at, from_us, blob_key, size)
       VALUES ($1, 'policy@pauseai.uk', 'on-a-letter', 't', 'joseph@pauseai.info', now(), true, 'x', 1)`,
      [letter],
    );
    await query(
      `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id, sender) VALUES ('letter', $1, 'x@parliament.uk', 'sent', 'sent-one', 'policy@pauseai.uk')`,
      [letter],
    );
    expect(await keep({ id: "on-a-letter", from: `Polly <${POLLY}>` })).toBeUndefined();
    expect(await keep({ id: "sent-one", from: `Polly <${POLLY}>` })).toBeUndefined();
    expect(await query("SELECT 1 FROM one_off_messages")).toEqual([]);
  });

  it("threads across mailboxes by what a message answers, and in one by its Gmail thread", async () => {
    await addTestPolitician();
    const first = await keep({ id: "a", from: POLLY, thread: "t1" });
    expect(await keep({ id: "b", from: "joseph@pauseai.info", thread: "t1", at: 1790000001000 })).toBe(first);
    expect(await keep({ id: "c", from: POLLY, inReplyTo: "b@example.org", thread: "other" }, "joseph@pauseai.uk")).toBe(
      first,
    );
    expect(await threads()).toHaveLength(1);
    const [{ latest }] = await query<{ latest: Date }>("SELECT latest_at AS latest FROM one_off_threads");
    expect(new Date(latest).getTime()).toBe(1790000001000);
  });

  it("makes two threads one when a message answers both", async () => {
    await addTestPolitician();
    const a = await keep({ id: "a", from: POLLY });
    const b = await keep({ id: "b", from: "v@example.com", at: 1790000005000 });
    expect(a).not.toBe(b);
    await keep({ id: "c", from: POLLY, thread: "t-a", inReplyTo: "b@example.org" });
    expect(await threads()).toEqual([{ id: a }]);
    const [thread] = await query<{ someone: boolean; latest: Date }>(
      "SELECT someone_else AS someone, latest_at AS latest FROM one_off_threads",
    );
    expect(thread.someone).toBe(true);
    expect(new Date(thread.latest).getTime()).toBe(1790000005000);
  });

  it("says who's in a thread: PauseAI's and politicians, or someone else as soon as anyone else writes", async () => {
    await addTestPolitician();
    await keep({ id: "a", from: POLLY });
    await keep({ id: "b", from: "joseph@pauseai.info", thread: "t-a" });
    const someone = async () => (await query<{ s: boolean }>("SELECT someone_else AS s FROM one_off_threads"))[0].s;
    expect(await someone()).toBe(false);
    await keep({ id: "c", from: "vera@example.com", thread: "t-a" });
    expect(await someone()).toBe(true);
  });

  it("lists threads newest first, filtered, and hides a thread with someone else from staff without supporters", async () => {
    const polly = await addTestPolitician();
    await keep({ id: "a", from: `Polly <${POLLY}>`, subject: "Ours", at: 1790000000000 });
    await keep({ id: "b", from: "Vera <vera@example.com>", to: POLLY, subject: "Theirs", at: 1790000009000 });
    const all = await politicianOneOffs(polly, ["supporters"]);
    expect(all.map((t) => t.subject)).toEqual(["Theirs", "Ours"]);
    expect(all[0]).toMatchObject({
      participants: ["Vera"],
      someoneElse: true,
      messages: 1,
      people: [{ id: polly, name: "Polly Placeholder" }],
    });
    const limited = await politicianOneOffs(polly, []);
    expect(limited[0]).toMatchObject({
      subject: null,
      participants: null,
      mailboxes: null,
      answered: null,
      someoneElse: true,
    });
    expect(limited[1]).toMatchObject({ subject: "Ours", participants: ["Polly"], answered: false });
    expect(limited[1].mailboxes).toHaveLength(1);
  });

  it("opens a thread's messages, its text from its blob; for staff without supporters, not one with someone else", async () => {
    await addTestPolitician();
    const ours = (await keep({ id: "a", from: POLLY, text: "Thanks." }))!;
    const theirs = (await keep({ id: "b", from: "vera@example.com", text: "Private." }))!;
    const thread = await getOneOffThread(ours, []);
    expect(thread?.messages_?.[0]).toMatchObject({ fromAddress: POLLY, text: "Thanks." });
    expect(thread?.messages_?.[0].politicians[POLLY]).toBeTypeOf("number");
    expect((await getOneOffThread(theirs, ["supporters"]))?.messages_?.[0].text).toBe("Private.");
    expect(await getOneOffThread(theirs, [])).toMatchObject({ subject: null, messages_: null });
    expect(await getOneOffThread(99, ["supporters"])).toBeUndefined();
  });

  it("lists a politician's and a supporter's, and erases a supporter's with their blobs", async () => {
    const polly = await addTestPolitician();
    await addFormEntry("march-2026-11", {
      name: "Vera Volunteer",
      email: "vera@example.com",
      phone: null,
      city: null,
      postcode: null,
      consent: false,
      utmSource: null,
    });
    const [{ supporter, email }] = await query<{ supporter: number; email: string }>(
      `SELECT supporter_id::int AS supporter, matched_value AS email FROM supporter_links LIMIT 1`,
    );
    await keep({ id: "a", from: email, to: POLLY, subject: "Theirs", text: "Mine." });
    await keep({ id: "b", from: POLLY, thread: "t-a", to: email });
    await keep({ id: "c", from: POLLY, subject: "Ours" });
    expect((await politicianOneOffs(polly, ["supporters"])).map((t) => t.subject)).toEqual(["Ours", "Theirs"]);
    expect((await politicianOneOffs(polly, [])).map((t) => t.subject)).toEqual(["Ours", null]);
    expect((await supporterOneOffs(supporter)).map((t) => t.subject)).toEqual(["Theirs"]);
    const kept = (
      await query<{ key: string }>("SELECT blob_key AS key FROM one_off_messages WHERE gmail_message_id = 'a'")
    )[0].key;
    const result = await eraseSupporter(supporter, "ICO-1", "jo@pauseai.uk");
    expect(result?.oneOffs).toBe(2);
    expect(await query("SELECT 1 FROM one_off_messages")).toHaveLength(1);
    expect(await query("SELECT 1 FROM one_off_threads")).toHaveLength(1);
    const [{ text }] = [{ text: (await import("./outside-services/blobs")).letterReply(kept) }];
    expect(await text).toBeUndefined();
    await deleteOneOffBlobs([]);
  });

  it("doesn't keep an erased message again, nor its copy in another mailbox, with or without a Message-ID", async () => {
    await addFormEntry("march-2026-11", {
      name: "Vera Volunteer",
      email: "vera@example.com",
      phone: null,
      city: null,
      postcode: null,
      consent: false,
      utmSource: null,
    });
    const [{ supporter, email }] = await query<{ supporter: number; email: string }>(
      `SELECT supporter_id::int AS supporter, matched_value AS email FROM supporter_links LIMIT 1`,
    );
    await keep({ id: "a", from: email, to: POLLY });
    await keep({ id: "b", from: email, to: POLLY, rfc: "" });
    await eraseSupporter(supporter, "ICO-1", "jo@pauseai.uk");
    expect(await query("SELECT rfc_sha256 IS NULL AS blank FROM one_off_erased ORDER BY gmail_message_id")).toEqual([
      { blank: false },
      { blank: true },
    ]);
    expect(await keep({ id: "a", from: email, to: POLLY })).toBeUndefined();
    expect(await keep({ id: "b", from: email, to: POLLY, rfc: "" })).toBeUndefined();
    const copy = { ...headers({ id: "a", from: email, to: POLLY }), id: "copy" };
    expect(await keepOneOff("joseph@pauseai.uk", copy, Buffer.from("x"), await politicianBook(), [])).toBeUndefined();
    expect(await query("SELECT 1 FROM one_off_messages")).toEqual([]);
  });

  describe("the regular read", () => {
    const fetched = (token: string, id: string) => gmailMessageHeaders(token, id, ONE_OFF_HEADERS);
    const shared = async (id: string) => {
      const token = "fixture-access:policy@pauseai.uk";
      return keepIfPoliticianThread("policy@pauseai.uk", token, await fetched(token, id), true);
    };
    const josephs = async (id: string) => {
      const token = "fixture-access:joseph@pauseai.uk";
      return keepIfPoliticianThread("joseph@pauseai.uk", token, await fetched(token, id), false);
    };

    it("keeps a message by its headers", async () => {
      await addTestPolitician();
      mailbox({ id: "m1", from: `Polly <${POLLY}>` }, { id: "m2", from: "staff@parliament.uk" });
      expect(await josephs("m1")).toBe("kept");
      expect(await josephs("m2")).toBe("kept");
    });

    it("keeps one that joins a thread already kept", async () => {
      await addTestPolitician();
      mailbox(
        { id: "m1", from: POLLY, thread: "t" },
        { id: "m2", from: "x@example.com", thread: "t" },
        { id: "m3", from: "x@example.com", inReplyTo: "m1@example.org" },
      );
      await josephs("m1");
      expect(await josephs("m2")).toBe("kept");
      expect(await josephs("m3")).toBe("kept");
    });

    describe("the rest of the thread", () => {
      const inThread = (...ids: string[]) =>
        server.use(http.get(`${GMAIL}/threads/t`, () => HttpResponse.json({ messages: ids.map((id) => ({ id })) })));
      const keptIds = async () =>
        (await query<{ id: string }>("SELECT gmail_message_id AS id FROM one_off_messages ORDER BY id")).map(
          (m) => m.id,
        );

      it("keeps what came before the message that counts, and takes its subject from the first", async () => {
        await addTestPolitician();
        mailbox(
          { id: "m1", from: "friend@example.com", thread: "t", subject: "A question" },
          { id: "m2", from: POLLY, thread: "t", subject: "Re: A question" },
        );
        inThread("m1", "m2");
        expect(await josephs("m1")).toBe("ignored");
        expect(await keptIds()).toEqual([]);
        expect(await josephs("m2")).toBe("kept");
        expect(await keptIds()).toEqual(["m1", "m2"]);
        expect(await query("SELECT subject FROM one_off_threads")).toEqual([{ subject: "A question" }]);
      });

      it("takes what came before off shared mail's report of what matched nothing, unless it's been reported", async () => {
        await addTestPolitician();
        mailbox(
          { id: "m1", from: "sue@example.com", thread: "t" },
          { id: "m2", from: "sue@example.com", thread: "t" },
          { id: "m3", from: POLLY, thread: "t" },
        );
        inThread("m1", "m2", "m3");
        await shared("m1");
        await shared("m2");
        await query("UPDATE unmatched_mail SET reported_at = now() WHERE gmail_message_id = 'm1'");
        await shared("m3");
        expect(await keptIds()).toEqual(["m1", "m2", "m3"]);
        expect(await query("SELECT gmail_message_id AS id FROM unmatched_mail")).toEqual([{ id: "m1" }]);
      });

      it("reads only what isn't kept yet, picking up what a read that stopped partway left", async () => {
        await addTestPolitician();
        mailbox(
          { id: "m1", from: "friend@example.com", thread: "t" },
          { id: "m2", from: "friend@example.com", thread: "t" },
          { id: "m3", from: POLLY, thread: "t" },
          { id: "m4", from: "friend@example.com", thread: "t" },
        );
        inThread("m1", "m3");
        await josephs("m3");
        expect(await keptIds()).toEqual(["m1", "m3"]);
        inThread("m1", "m2", "m3", "m4");
        expect(await josephs("m4")).toBe("kept");
        expect(await keptIds()).toEqual(["m1", "m2", "m3", "m4"]);
        // Its own message read again changes nothing.
        expect(await josephs("m4")).toBe("kept");
        expect(await keptIds()).toEqual(["m1", "m2", "m3", "m4"]);
      });

      it("keeps a message of a thread that another mailbox's message joined it to", async () => {
        await addTestPolitician();
        mailbox(
          { id: "m1", from: POLLY },
          { id: "m2", from: "vera@example.com", thread: "t" },
          { id: "m3", from: "vera@example.com", thread: "t", inReplyTo: "m1@example.org" },
        );
        inThread("m2", "m3");
        await josephs("m1");
        expect(await shared("m3")).toBe("kept");
        expect(await keptIds()).toEqual(["m1", "m2", "m3"]);
        expect(await threads()).toHaveLength(1);
      });

      it("passes over one that's gone, reports one Gmail won't give, and stops at any other failure", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        await addTestPolitician();
        mailbox({ id: "m3", from: POLLY, thread: "t" });
        const failing = (id: string, status: number) =>
          server.use(http.get(`${GMAIL}/messages/${id}`, () => new HttpResponse(null, { status })));
        failing("m1", 404);
        failing("m2", 400);
        inThread("m1", "m2", "m3");
        expect(await josephs("m3")).toBe("kept");
        expect(await keptIds()).toEqual(["m3"]);
        expect(logged).toHaveBeenCalledTimes(1);
        expect(logged).toHaveBeenCalledWith(staffCopy.problems.job.unreadable, "m2");
        failing("m1", 500);
        await expect(josephs("m3")).rejects.toThrow();
        logged.mockRestore();
      });
    });

    it("in Joseph's other mail, leaves it unread", async () => {
      mailbox({ id: "m1", from: "friend@example.com", text: `From: x@parliament.uk\nSent: 1 Jan 2026\nHello` });
      expect(await josephs("m1")).toBe("ignored");
      expect(await query("SELECT 1 FROM unmatched_mail")).toEqual([]);
    });

    it("in shared mail, reads what it quotes", async () => {
      const polly = await addTestPolitician();
      mailbox({
        id: "m1",
        from: "vera@example.com",
        text: `Look\n\nFrom: Polly <${POLLY}>\nSent: 1 Jan 2026\nTo: Vera <vera@example.com>\n\nHi`,
      });
      expect(await shared("m1")).toBe("kept");
      expect(await query<{ id: number }>("SELECT notable_person_id::int AS id FROM one_off_thread_people")).toEqual([
        { id: polly },
      ]);
    });

    it("the group's mail in Joseph's is shared too", async () => {
      mailbox({ id: "m1", from: "vera@example.com", list: "<policy.pauseai.uk>" });
      expect(await josephs("m1")).toBe("unmatched");
    });

    it("notes mail that matches nothing, leaving out what it recognises and what's PauseAI's", async () => {
      await connectTestGmail("policy@pauseai.uk");
      mailbox(
        { id: "m1", from: "sue@example.com", subject: "Hiring?" },
        { id: "m2", from: "noreply@notify.pauseai.uk" },
        { id: "m3", from: "x@example.com", labels: ["SPAM"] },
        { id: "m4", from: "policy@pauseai.uk" },
      );
      expect(await shared("m1")).toBe("unmatched");
      expect(await shared("m1")).toBe("unmatched");
      expect(await shared("m2")).toBe("ignored");
      expect(await shared("m3")).toBe("ignored");
      expect(await shared("m4")).toBe("ignored");
      expect(await query("SELECT gmail_message_id AS id FROM unmatched_mail")).toEqual([{ id: "m1" }]);
    });

    it("runs in readGmail only for a mailbox whose threads are kept", async () => {
      await addTestPolitician();
      await connectTestGmail("policy@pauseai.uk");
      vi.stubEnv("POLICY_INBOX", "policy@pauseai.uk");
      mailbox({ id: "m1", from: POLLY }, { id: "m2", from: "stranger@example.com" });
      const history = () =>
        server.use(
          http.get(`${GMAIL}/history`, () =>
            HttpResponse.json({
              historyId: "2",
              history: [{ messagesAdded: [{ message: { id: "m1" } }, { message: { id: "m2" } }] }],
            }),
          ),
          http.get(`${GMAIL}/messages`, () => HttpResponse.json({})),
        );
      history();
      const { accounts } = await readGmail("nightly");
      expect(accounts[0].oneOffs).toBe(1);
      expect(await threads()).toHaveLength(1);
      await query("DELETE FROM one_off_threads");
      await query("DELETE FROM staff_accounts WHERE email = 'policy@pauseai.uk'");
      await connectTestGmail("jo@pauseai.uk");
      await readGmail("nightly");
      expect(await threads()).toHaveLength(0);
    });
  });

  it("knows a politician by a past address, from the audit log, and their own domain", async () => {
    const polly = await addTestPolitician();
    await query(`INSERT INTO audit_log (actor, action, details) VALUES ('sync', 'edit politician', $1)`, [
      JSON.stringify({ id: polly, changed: { email: ["old.polly@example.com", null] } }),
    ]);
    await query("INSERT INTO politician_domains (domain, notable_person_id) VALUES ('polly.example', $1)", [polly]);
    const book = await politicianBook();
    expect(book.addresses.get("old.polly@example.com")).toEqual([polly]);
    expect(book.domains.get("polly.example")).toBe(polly);
  });

  it("copes with a message missing every header", async () => {
    const bare = {
      id: "bare",
      threadId: "t",
      labelIds: [],
      internalDate: "1790000000000",
      headers: new Map<string, string>(),
    };
    const thread = await keepOneOff("policy@pauseai.uk", bare, Buffer.from("x"), await politicianBook(), []);
    expect(thread).toBeGreaterThan(0);
    const [row] = await query<Record<string, unknown>>(
      `SELECT from_address AS "from", subject, to_line AS "to", rfc_message_id AS rfc FROM one_off_messages`,
    );
    expect(row).toEqual({ from: "", subject: "", to: "", rfc: null });
  });

  describe("the daily report of what matched nothing", () => {
    const token = async (account: string) => `fixture-access:${account}`;
    const notes: string[] = [];
    beforeEach(() => {
      notes.length = 0;
      vi.stubEnv("NOTIFICATION_INBOX", "notify@pauseai.uk");
      vi.stubEnv("POSTMARK_SERVER_TOKEN", "t");
    });
    const add = (id: string, reported: string | null = null) =>
      query(
        "INSERT INTO unmatched_mail (account, gmail_message_id, reported_at) VALUES ('policy@pauseai.uk', $1, $2)",
        [id, reported],
      );

    it("leaves the batch unreported when the email can't go, to report it next time", async () => {
      await add("r3");
      server.use(
        http.get(`${GMAIL}/messages/r3`, () =>
          HttpResponse.json({
            id: "r3",
            threadId: "t",
            labelIds: [],
            internalDate: "1",
            payload: {
              headers: [
                { name: "From", value: "a@example.org" },
                { name: "Subject", value: "Hi" },
              ],
            },
          }),
        ),
      );
      vi.stubEnv("NOTIFICATION_INBOX", "");
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await reportUnmatchedMail(token)).toBe(0);
      expect(await query("SELECT gmail_message_id AS id FROM unmatched_mail WHERE reported_at IS NULL")).toEqual([
        { id: "r3" },
      ]);
      // Not tried again for a day, however often Gmail is read.
      const asked = vi.fn();
      server.events.on("request:start", asked);
      expect(await reportUnmatchedMail(token)).toBe(0);
      expect(asked).not.toHaveBeenCalled();
      server.events.removeListener("request:start", asked);
      vi.stubEnv("NOTIFICATION_INBOX", "notify@pauseai.uk");
      await query("UPDATE unmatched_mail SET tried_at = now() - interval '2 days'");
      expect(await reportUnmatchedMail(token)).toBe(1);
    });

    it("lists the oldest in a report, says how many more wait, and leaves those for the next", async () => {
      await query(
        `INSERT INTO unmatched_mail (account, gmail_message_id, found_at)
         SELECT 'policy@pauseai.uk', 'm' || n, now() - n * interval '1 minute' FROM generate_series(1, 102) n`,
      );
      server.use(
        http.get(`${GMAIL}/messages/:id`, ({ params }) =>
          HttpResponse.json({
            id: params.id,
            threadId: "t",
            labelIds: [],
            internalDate: "1",
            payload: { headers: [] },
          }),
        ),
      );
      const sent = notifications();
      expect(await reportUnmatchedMail(token)).toBe(100);
      expect(sent.map((email) => email.TextBody).join()).toContain(staffCopy.oneOff.unmatchedAlert.more(2));
      expect(
        await query("SELECT gmail_message_id AS id FROM unmatched_mail WHERE reported_at IS NULL ORDER BY id"),
      ).toEqual([{ id: "m1" }, { id: "m2" }]);
    });

    it("copes with a message with no sender or subject", async () => {
      await add("r2");
      server.use(
        http.get(`${GMAIL}/messages/r2`, () =>
          HttpResponse.json({ id: "r2", threadId: "t", labelIds: [], internalDate: "1", payload: { headers: [] } }),
        ),
      );
      expect(await reportUnmatchedMail(token)).toBe(1);
    });

    it("lists each by sender and subject, once", async () => {
      await add("r1");
      mailbox({ id: "r1", from: "Sue <sue@example.com>", subject: "Hiring?" });
      expect(await reportUnmatchedMail(token)).toBe(1);
      const [{ subject }] = await query<{ subject: string }>(
        "SELECT subject FROM email_sends WHERE purpose = 'staff-report'",
      );
      expect(subject).toContain("1");
      expect(await reportUnmatchedMail(token)).toBe(0);
    });

    it("waits a day from the last", async () => {
      await add("r0", new Date().toISOString());
      await add("r1");
      mailbox({ id: "r1", from: "Sue <sue@example.com>" });
      expect(await reportUnmatchedMail(token)).toBe(0);
      await query("UPDATE unmatched_mail SET reported_at = now() - interval '2 days' WHERE gmail_message_id = 'r0'");
      expect(await reportUnmatchedMail(token)).toBe(1);
    });

    it("reports none with none, and leaves out what's gone since", async () => {
      expect(await reportUnmatchedMail(token)).toBe(0);
      await add("gone");
      server.use(http.get(`${GMAIL}/messages/gone`, () => new HttpResponse("{}", { status: 404 })));
      expect(await reportUnmatchedMail(token)).toBe(0);
      expect(await query("SELECT 1 FROM unmatched_mail WHERE reported_at IS NULL")).toEqual([]);
    });
  });
});
