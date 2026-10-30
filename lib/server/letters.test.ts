import { expect, it, vi } from "vitest";
import { addTestLetter, addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { sentNearSearch } from "@/lib/letter-links";
import { query } from "./db";
import {
  getPauseaiLetter,
  getSupporterLetter,
  LETTERS_PAGE_SIZE,
  listLetters,
  pauseaiLetters,
  politicianLetters,
  recentLetters,
} from "./letters";

describeWithDatabase("recentLetters", () => {
  useTestDatabase();

  it("pages the letters page's list, with how many there are in all", async () => {
    const mp = await addTestMp();
    for (let i = 0; i <= LETTERS_PAGE_SIZE; i++) await addTestLetter({ politicianId: mp, replyHash: `h${i}` });
    const first = await listLetters({});
    expect([first.letters.length, first.total, first.pages]).toEqual([LETTERS_PAGE_SIZE, LETTERS_PAGE_SIZE + 1, 2]);
    const second = await listLetters({ page: 2 });
    expect([second.letters.length, second.total]).toEqual([1, LETTERS_PAGE_SIZE + 1]);
    expect(second.letters[0]).not.toHaveProperty("total");
    // Past the end, none, but still the count.
    expect(await listLetters({ page: 3 })).toEqual({
      letters: [],
      total: LETTERS_PAGE_SIZE + 1,
      pages: 2,
      pageSize: LETTERS_PAGE_SIZE,
    });
    expect(await listLetters({ status: "replied" })).toEqual({
      letters: [],
      total: 0,
      pages: 1,
      pageSize: LETTERS_PAGE_SIZE,
    });
    expect(await listLetters({ status: "replied", page: 2 })).toEqual({
      letters: [],
      total: 0,
      pages: 1,
      pageSize: LETTERS_PAGE_SIZE,
    });
  });

  it("lists letters newest first, with their history, filtered by status", async () => {
    const mp = await addTestMp();
    for (const [hash, status] of [
      ["a", "sent"],
      ["b", "sending"],
    ]) {
      await addTestLetter({
        politicianId: mp,
        senderName: "Jane",
        senderEmail: "jane@example.com",
        replyHash: hash,
        status,
      });
    }
    await query(
      "INSERT INTO letter_events (letter_id, status, details) VALUES (1, 'sending', '{}'), (1, 'sent', '{\"messageId\":\"m\"}')",
    );

    const letters = await recentLetters();
    expect(letters.map((l) => [l.id, l.status, l.mpName, l.politicianId, l.isTest, l.contactConsent])).toEqual([
      [2, "sending", "Testy McTestface MP", mp, true, false],
      [1, "sent", "Testy McTestface MP", mp, true, false],
    ]);
    expect((await recentLetters({ politicianId: mp })).map((l) => l.id)).toEqual([2, 1]);
    expect(await recentLetters({ politicianId: mp + 1 })).toEqual([]);
    // Newest first: at the same moment, the one recorded last.
    expect(letters[1].events.map((e) => [e.status, e.details])).toEqual([
      ["sent", { messageId: "m" }],
      ["sending", {}],
    ]);
    expect(letters[0].events).toEqual([]);
    expect((await recentLetters({ status: "sent" })).map((l) => l.id)).toEqual([1]);
    expect(await recentLetters({ status: "replied" })).toEqual([]);
    await query("UPDATE letters SET replied_at = '2026-10-13T09:00:00Z' WHERE id = 2");
    const replied = await recentLetters({ status: "replied" });
    expect(replied.map((l) => l.id)).toEqual([2]);
    expect(new Date(replied[0].repliedAt!).toISOString()).toBe("2026-10-13T09:00:00.000Z");
    expect(await recentLetters({ status: "auto_reply" })).toEqual([]);
    await query("INSERT INTO letter_events (letter_id, status, details) VALUES (1, 'auto_reply', '{}')");
    expect((await recentLetters({ status: "auto_reply" })).map((l) => l.id)).toEqual([1]);
    expect(await recentLetters({ limit: 1 })).toHaveLength(1);
  });

  it("filters by a search over sender and MP, by whether answered, by campaign, by consent, and by supporter", async () => {
    const mp = await addTestMp();
    for (const [hash, name, email, subject] of [
      ["a", "Jane Smith", "jane@example.com", "Please act"],
      ["b", "Sam Jones", "sam@example.com", "AI risk"],
    ]) {
      await addTestLetter({ politicianId: mp, senderName: name, senderEmail: email, subject, replyHash: hash });
    }
    await query("UPDATE letters SET replied_at = now() WHERE id = 2");
    await query("INSERT INTO supporters DEFAULT VALUES");
    await query(
      `INSERT INTO supporter_links (supporter_id, form_entry_id, matched_by, matched_value)
       SELECT 1, entry_id, 'email', 'jane@example.com' FROM letters_from_supporters WHERE id = 1`,
    );
    const ids = async (filter: Parameters<typeof recentLetters>[0]) => (await recentLetters(filter)).map((l) => l.id);
    expect(await ids({ search: "SMITH" })).toEqual([1]);
    expect(await ids({ search: "sam@" })).toEqual([2]);
    // Not the subject.
    expect(await ids({ search: "risk" })).toEqual([]);
    expect(await ids({ search: "McTestface" })).toEqual([2, 1]);
    expect(await ids({ answered: true })).toEqual([2]);
    expect(await ids({ answered: false })).toEqual([1]);
    await query("UPDATE letters_from_supporters SET campaign = 'support-sobel-bill' WHERE id = 2");
    expect(await ids({ campaign: "support-sobel-bill" })).toEqual([2]);
    expect(await ids({ campaign: "regulate-letter-pm" })).toEqual([1]);
    await query(
      "UPDATE form_entries SET contact_consent = true WHERE id = (SELECT entry_id FROM letters_from_supporters WHERE id = 1)",
    );
    expect(await ids({ consent: true })).toEqual([1]);
    expect(await ids({ consent: false })).toEqual([2]);
    expect(await ids({ supporterId: 1 })).toEqual([1]);
    expect(await ids({ supporterId: 2 })).toEqual([]);
    expect(await ids({ letterId: 1 })).toEqual([1]);
  });
});

describeWithDatabase("politicianLetters", () => {
  useTestDatabase();

  it("gives an MP's letters with their senders only to staff with supporters, and selects nothing of them otherwise", async () => {
    const mp = await addTestMp();
    await addTestLetter({
      politicianId: mp,
      senderName: "Jane",
      senderEmail: "jane@example.com",
      senderPostcode: "ZZ9 9ZZ",
      repliedAt: new Date().toISOString(),
    });
    const withSenders = await politicianLetters(mp, ["supporters"]);
    expect(withSenders.senders).toBe(true);
    expect(withSenders.letters).toMatchObject([{ id: 1, senderName: "Jane", senderEmail: "jane@example.com" }]);

    const without = await politicianLetters(mp, ["admin"]);
    expect(without).toEqual({
      senders: false,
      letters: [
        {
          id: 1,
          campaign: "regulate-letter-pm",
          campaignTitle: "Regulate AI developers now",
          campaignUrl: null,
          status: "sent",
          createdAt: expect.any(Date),
          repliedAt: expect.any(Date),
        },
      ],
    });
    expect(JSON.stringify(without)).not.toMatch(/Jane|jane@|ZZ9/);
    expect(await politicianLetters(mp + 1, [])).toEqual({ senders: false, letters: [] });
  });
});

describeWithDatabase("pauseaiLetters", () => {
  useTestDatabase();

  it("lists PauseAI's letters to a politician, newest first, with their mailing and whether personalised", async () => {
    const mp = await addTestMp();
    for (const [at, personalised] of [
      ["2026-06-10T09:00:00Z", false],
      ["2026-10-01T09:00:00Z", true],
    ] as const) {
      const [{ id }] = await query<{ id: number }>(
        "INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at) VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id",
        [mp, at],
      );
      await query(
        `INSERT INTO letters_from_pauseai (id, mailing_id, personalised)
         SELECT $1, id, $2 FROM mailings WHERE airtable_field = 'CSRB Iqbal Amendment'`,
        [id, personalised],
      );
    }
    // A supporter's letter isn't one of them, nor is it on the letters page as PauseAI's.
    await addTestLetter({ politicianId: mp });
    expect(await pauseaiLetters(mp)).toEqual([
      {
        id: 2,
        mailingId: expect.any(Number),
        mailing: "CSRB Iqbal Amendment",
        status: "sent",
        at: new Date("2026-10-01T09:00:00Z"),
        personalised: true,
      },
      {
        id: 1,
        mailingId: expect.any(Number),
        mailing: "CSRB Iqbal Amendment",
        status: "sent",
        at: new Date("2026-06-10T09:00:00Z"),
        personalised: false,
      },
    ]);
    expect((await recentLetters()).map((l) => [l.id, l.imported])).toEqual([[3, false]]);
    expect(await pauseaiLetters(mp + 1)).toEqual([]);
  });
});

describeWithDatabase("a letter for its page", () => {
  useTestDatabase();

  it("gives a supporter's letter, with its subject, found in the policy inbox by the newest send's Postmark ID", async () => {
    vi.stubEnv("POLICY_INBOX", "policy@pauseai.uk");
    const mp = await addTestMp();
    const id = await addTestLetter({ politicianId: mp, senderName: "Jane Smith" });
    await query(
      `INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id) VALUES
         ('2026-10-01T09:00:00Z', 'letter', $1, 'test-mp@example.org', 'sent', 'pm-old'),
         ('2026-10-02T09:00:00Z', 'letter', $1, 'test-mp@example.org', 'sent', 'pm-new'),
         ('2026-10-03T09:00:00Z', 'letter', $1, 'test-mp@example.org', 'failed', NULL)`,
      [id],
    );
    const letter = await getSupporterLetter(id);
    expect(letter).toMatchObject({
      kind: "supporter",
      id,
      senderName: "Jane Smith",
      gmail: { mailbox: "policy@pauseai.uk", search: "rfc822msgid:pm-new@mtasv.net" },
    });
    expect(typeof (letter as { subject: string }).subject).toBe("string");
    expect(await getSupporterLetter(id + 100)).toBeUndefined();
    // One copied from Airtable, which Postmark didn't send, by its MP's address and when it went; with no
    // policy inbox, in a mailbox we don't know.
    vi.stubEnv("POLICY_INBOX", "");
    const imported = await addTestLetter({ politicianId: mp, sentAt: "2026-10-01T12:00:00Z" });
    expect(await getSupporterLetter(imported)).toMatchObject({
      gmail: { mailbox: null, search: sentNearSearch("test-mp@example.org", "2026-10-01T12:00:00Z") },
    });
    // One never sent has nothing to find; nor has one to an MP with no address.
    const unsent = await addTestLetter({ politicianId: mp });
    expect(await getSupporterLetter(unsent)).toMatchObject({ gmail: null });
    const noAddress = await addTestLetter({
      politicianId: await addTestPolitician({ email: null }),
      sentAt: "2026-10-01T12:00:00Z",
    });
    expect(await getSupporterLetter(noAddress)).toMatchObject({ gmail: null });
    vi.unstubAllEnvs();
  });

  it("gives PauseAI's letter in its mailing, with the mailing and the MP's address; not in another, nor as a supporter's", async () => {
    const mp = await addTestMp("mp@example.org");
    const [{ id }] = await query<{ id: number }>(
      "INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at) VALUES ('pauseai', $1, 'sent', $2, $2) RETURNING id::int AS id",
      [mp, "2026-10-01T09:00:00Z"],
    );
    await query(
      `INSERT INTO letters_from_pauseai (id, mailing_id, personalised)
       SELECT $1, id, true FROM mailings WHERE airtable_field = 'CSRB Iqbal Amendment'`,
      [id],
    );
    const [{ mailing }] = await query<{ mailing: number }>(
      "SELECT mailing_id::int AS mailing FROM letters_from_pauseai WHERE id = $1",
      [id],
    );
    expect(await getPauseaiLetter(mailing + 1, id)).toBeUndefined();
    expect(await getSupporterLetter(id)).toBeUndefined();
    expect(await getPauseaiLetter(mailing, id)).toEqual({
      kind: "pauseai",
      id,
      status: "sent",
      createdAt: new Date("2026-10-01T09:00:00Z"),
      sentAt: new Date("2026-10-01T09:00:00Z"),
      mpName: "Testy McTestface MP",
      politicianId: mp,
      mpEmail: "mp@example.org",
      mailingId: mailing,
      mailing: "CSRB Iqbal Amendment",
      mailingAsk: null,
      personalised: true,
      gmail: { mailbox: null, search: sentNearSearch("mp@example.org", "2026-10-01T09:00:00Z") },
      events: [],
    });
  });

  it("finds PauseAI's letter in Gmail by its Message-ID, a reply's, or its MP's address and time; an unsent one not at all", async () => {
    const mp = await addTestMp("mp@example.org");
    const [{ mailing }] = await query<{ mailing: number }>(
      "UPDATE mailings SET sent_from = 'policy@pauseai.uk' WHERE airtable_field = 'CSRB Iqbal Amendment' RETURNING id::int AS mailing",
    );
    const letter = async (sentAt: string | null, to = mp) => {
      const [{ id }] = await query<{ id: number }>(
        "INSERT INTO letters (kind, notable_person_id, status, sent_at) VALUES ('pauseai', $1, 'sent', $2) RETURNING id::int AS id",
        [to, sentAt],
      );
      await query("INSERT INTO letters_from_pauseai (id, mailing_id) VALUES ($1, $2)", [id, mailing]);
      return id;
    };
    const send = (id: number, rfc: string | null) =>
      query(
        `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id, backend, sender, rfc_message_id, gmail_thread_id)
         VALUES ('mailing', $1, 'mp@example.org', 'sent', 'g-1', 'gmail', 'policy@pauseai.uk', $2, 'thread-1')`,
        [id, rfc],
      );
    const reply = (id: number, rfc: string | null, at: string) =>
      query(
        `INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, rfc_message_id, from_address, at, from_us, blob_key, size)
         VALUES ($1, 'jo@pauseai.uk', $3, 'thread-2', $2, 'mp@example.org', $4, false, $3, 0)`,
        [id, rfc, `g-${at}`, at],
      );
    const at = "2026-10-01T09:00:00Z";

    // Sent from Gmail: by the Message-ID it went with, in the mailbox it went from.
    const sent = await letter(at);
    await send(sent, "abc@pauseai.uk");
    expect((await getPauseaiLetter(mailing, sent))!.gmail).toEqual({
      mailbox: "policy@pauseai.uk",
      search: "rfc822msgid:abc@pauseai.uk",
    });
    // Its Message-ID not kept: by its MP's address and when it went.
    const noId = await letter(at);
    await send(noId, null);
    expect((await getPauseaiLetter(mailing, noId))!.gmail).toEqual({
      mailbox: "policy@pauseai.uk",
      search: sentNearSearch("mp@example.org", at),
    });
    // Not sent from here, but replied to: by the first reply with a Message-ID, in the mailbox that read it.
    const replied = await letter(at);
    await reply(replied, null, "2026-10-02T09:00:00Z");
    await reply(replied, "reply-2@parliament.uk", "2026-10-04T09:00:00Z");
    await reply(replied, "reply-1@parliament.uk", "2026-10-03T09:00:00Z");
    expect((await getPauseaiLetter(mailing, replied))!.gmail).toEqual({
      mailbox: "jo@pauseai.uk",
      search: "rfc822msgid:reply-1@parliament.uk",
    });
    // Never sent, or to an MP with no address and nothing else to go by: nothing to find.
    expect((await getPauseaiLetter(mailing, await letter(null)))!.gmail).toBeNull();
    expect(
      (await getPauseaiLetter(mailing, await letter(at, await addTestPolitician({ email: null }))))!.gmail,
    ).toBeNull();
  });
});
