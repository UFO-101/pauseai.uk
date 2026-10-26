import { expect, it } from "vitest";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { politicianLetters, recentLetters } from "./letters";

describeWithDatabase("recentLetters", () => {
  useTestDatabase();

  it("lists letters newest first, with their history, filtered by status", async () => {
    const mp = await addTestMp();
    for (const [hash, status] of [
      ["a", "sent"],
      ["b", "sending"],
    ]) {
      await query(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status)
         VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', $2, $3)`,
        [mp, hash, status],
      );
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

  it("filters by a search over sender, MP and subject, by whether answered, by campaign, and by supporter", async () => {
    const mp = await addTestMp();
    for (const [hash, name, email, subject] of [
      ["a", "Jane Smith", "jane@example.com", "Please act"],
      ["b", "Sam Jones", "sam@example.com", "AI risk"],
    ]) {
      await query(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status)
         VALUES ('regulate-letter-pm', $1, $2, $3, 'x', 'ZZ9 9ZZ', false, $4, $5, 'sent')`,
        [mp, name, email, subject, hash],
      );
    }
    await query("UPDATE letters SET replied_at = now() WHERE id = 2");
    await query("INSERT INTO supporters DEFAULT VALUES");
    await query(
      "INSERT INTO supporter_links (supporter_id, letter_id, matched_by, matched_value) VALUES (1, 1, 'email', 'jane@example.com')",
    );
    const ids = async (filter: Parameters<typeof recentLetters>[0]) => (await recentLetters(filter)).map((l) => l.id);
    expect(await ids({ search: "SMITH" })).toEqual([1]);
    expect(await ids({ search: "sam@" })).toEqual([2]);
    expect(await ids({ search: "risk" })).toEqual([2]);
    expect(await ids({ search: "McTestface" })).toEqual([2, 1]);
    expect(await ids({ answered: true })).toEqual([2]);
    expect(await ids({ answered: false })).toEqual([1]);
    await query("UPDATE letters SET campaign = 'support-sobel-bill' WHERE id = 2");
    expect(await ids({ campaign: "support-sobel-bill" })).toEqual([2]);
    expect(await ids({ campaign: "regulate-letter-pm" })).toEqual([1]);
    expect(await ids({ supporterId: 1 })).toEqual([1]);
    expect(await ids({ supporterId: 2 })).toEqual([]);
    expect(await ids({ letterId: 1 })).toEqual([1]);
  });
});

describeWithDatabase("politicianLetters", () => {
  useTestDatabase();

  it("gives an MP's letters with their senders only to staff with supporters, and selects nothing of them otherwise", async () => {
    const mp = await addTestMp();
    await query(
      `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, replied_at)
       VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'a', 'sent', now())`,
      [mp],
    );
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
