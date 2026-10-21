import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { eraseSupporter } from "./erasure";
import { importLuma } from "./luma-import";
import { linkSupporters } from "./supporters";

beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
afterEach(() => vi.unstubAllEnvs());

async function janeWithEverything(mp: number): Promise<number> {
  // Jane: a Luma user with registrations, a letter with a reply forwarded to her, a bounce record, and an opt-out.
  await importLuma("test");
  const [{ id: letterId }] = await query<{ id: number }>(
    `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status)
     VALUES ('regulate-letter-pm', $1, 'Jane', 'jane.fixture@example.com', 'x', 'ZZ9 9ZZ', true, 'S', 'h1', 'sent') RETURNING id::int AS id`,
    [mp],
  );
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'sent', '{}')", [letterId]);
  await query(
    `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES
       ('letter', $1, 'test-mp@example.org', 'sent', 'm1'),
       ('forwarded-reply', $1, 'jane.fixture@example.com', 'sent', 'm2'),
       ('forwarded-reply', $1, 'replies@example.org', 'sent', 'm3')`,
    [letterId],
  );
  await query(
    `INSERT INTO email_problems (address, kind, reason, can_reset) VALUES ('jane.fixture@example.com', 'hard', 'gone', true)`,
  );
  await query(
    `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at) VALUES ('jane.fixture@example.com', 'luma-calendar', 'luma-webhook', 'w', now())`,
  );
  await linkSupporters();
  const [{ id }] = await query<{ id: number }>(
    "SELECT supporter_id::int AS id FROM supporter_links WHERE letter_id = $1",
    [letterId],
  );
  return id;
}

describeWithDatabase("eraseSupporter", () => {
  useTestDatabase();

  it("deletes what each source holds, keeps what stops us mailing the address, blocks the Luma user from coming back, and logs it", async () => {
    const mp = await addTestMp();
    const id = await janeWithEverything(mp);

    expect(await eraseSupporter(id, "ICO-123", "jo@pauseai.uk")).toEqual({ lumaUsers: 1, letters: 1 });
    expect(await query("SELECT 1 FROM supporters WHERE id = $1", [id])).toEqual([]);
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM luma_guests WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM letters WHERE sender_email = 'jane.fixture@example.com'")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM letter_events")).toEqual([{ n: 0 }]);
    // The letter's own send and the copy to the shared inbox stay, without their letter; the one to Jane goes.
    expect(await query("SELECT address, letter_id FROM email_sends ORDER BY id")).toEqual([
      { address: "test-mp@example.org", letter_id: null },
      { address: "replies@example.org", letter_id: null },
    ]);
    expect(await query("SELECT count(*)::int AS n FROM email_problems")).toEqual([{ n: 1 }]);
    expect(await query("SELECT count(*)::int AS n FROM opt_outs")).toEqual([{ n: 1 }]);
    expect(await query("SELECT user_id FROM luma_erased")).toEqual([{ user_id: "usr-fixture-1" }]);
    expect(await query("SELECT actor, action, details FROM audit_log ORDER BY id DESC LIMIT 1")).toEqual([
      {
        actor: "jo@pauseai.uk",
        action: "erase supporter",
        details: { id, reference: "ICO-123", lumaUsers: 1, letters: 1 },
      },
    ]);
    // Everyone else is still there, and the next import doesn't bring Jane back.
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 5 }]);
    await query("UPDATE luma_events SET guests_synced_at = NULL");
    await importLuma("test");
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 5 }]);
  });

  it("does nothing for a supporter that doesn't exist", async () => {
    expect(await eraseSupporter(999, "ref", "jo@pauseai.uk")).toBeUndefined();
    expect(await query("SELECT count(*)::int AS n FROM audit_log")).toEqual([{ n: 0 }]);
  });
});
