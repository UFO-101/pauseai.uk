import { expect, it } from "vitest";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { LETTERS_PAGE_SIZE, listLetters, pauseaiLetters, politicianLetters, recentLetters } from "./letters";

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
    expect(await listLetters({ page: 3 })).toEqual({ letters: [], total: LETTERS_PAGE_SIZE + 1, pages: 2 });
    expect(await listLetters({ status: "replied" })).toEqual({ letters: [], total: 0, pages: 1 });
    expect(await listLetters({ status: "replied", page: 2 })).toEqual({ letters: [], total: 0, pages: 1 });
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
    expect(letters[1].events.map((e) => [e.status, e.details])).toEqual([
      ["sending", {}],
      ["sent", { messageId: "m" }],
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
      "INSERT INTO supporter_links (supporter_id, letter_id, matched_by, matched_value) VALUES (1, 1, 'email', 'jane@example.com')",
    );
    const ids = async (filter: Parameters<typeof recentLetters>[0]) => (await recentLetters(filter)).map((l) => l.id);
    expect(await ids({ search: "SMITH" })).toEqual([1]);
    expect(await ids({ search: "sam@" })).toEqual([2]);
    // Not the subject.
    expect(await ids({ search: "risk" })).toEqual([]);
    expect(await ids({ search: "McTestface" })).toEqual([2, 1]);
    expect(await ids({ answered: true })).toEqual([2]);
    expect(await ids({ answered: false })).toEqual([1]);
    await query("UPDATE supporter_letters SET campaign = 'support-sobel-bill' WHERE id = 2");
    expect(await ids({ campaign: "support-sobel-bill" })).toEqual([2]);
    expect(await ids({ campaign: "regulate-letter-pm" })).toEqual([1]);
    await query("UPDATE supporter_letters SET contact_consent = true WHERE id = 1");
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
        `INSERT INTO pauseai_letters (id, mailing_id, personalised)
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
