import { expect, it } from "vitest";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { recentLetters } from "./letters";

describeWithDatabase("recentLetters", () => {
  useTestDatabase();

  it("lists letters newest first, with their history, filtered by status", async () => {
    const mp = await addTestMp();
    for (const [hash, status] of [["a", "sent"], ["b", "sending"]]) {
      await query(
        `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, body, reply_hash, status)
         VALUES ('regulate-letter-pm', $1, 'Jane', 'jane@example.com', 'x', 'ZZ9 9ZZ', false, 'S', 'B', $2, $3)`,
        [mp, hash, status],
      );
    }
    await query("INSERT INTO letter_events (letter_id, status, details) VALUES (1, 'sending', '{}'), (1, 'sent', '{\"messageId\":\"m\"}')");

    const letters = await recentLetters();
    expect(letters.map((l) => [l.id, l.status, l.mpName, l.isTest, l.contactConsent])).toEqual([
      [2, "sending", "Testy McTestface MP", true, false],
      [1, "sent", "Testy McTestface MP", true, false],
    ]);
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
    expect(await recentLetters({ limit: 1 })).toHaveLength(1);
  });
});
