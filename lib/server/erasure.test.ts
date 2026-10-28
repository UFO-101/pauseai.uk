import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { eraseSupporter } from "./erasure";
import { importLuma } from "./luma-import";
import { importMembers } from "./members-import";
import { linkSupporters } from "./supporters";

beforeEach(() => {
  vi.stubEnv("LUMA_API_KEY", "k");
  vi.stubEnv("AIRTABLE_TOKEN", "t");
});
afterEach(() => vi.unstubAllEnvs());

async function janeWithEverything(mp: number): Promise<number> {
  // Jane: a Luma user with registrations, a member, a letter with a reply forwarded to her, a bounce record, and an opt-out.
  await importLuma("test");
  await importMembers("test");
  const letterId = await addTestLetter({
    politicianId: mp,
    senderName: "Jane",
    senderEmail: "jane.fixture@example.com",
    contactConsent: true,
    replyHash: "h1",
  });
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
  // A march sign-up: an entry with no letter, and what Luma said.
  await query(
    `WITH entry AS (
       INSERT INTO form_entries (form, name, email, phone, contact_consent)
       VALUES ('march-2026-11', 'Jane', 'jane.fixture@example.com', '07700 900000', true) RETURNING id)
     INSERT INTO form_entry_luma (entry_id, event_id, status) SELECT id, 'evt-march', 'added' FROM entry`,
  );
  await linkSupporters();
  const [{ id }] = await query<{ id: number }>(
    `SELECT k.supporter_id::int AS id FROM supporter_links k JOIN supporter_letters s ON s.entry_id = k.form_entry_id
     WHERE s.id = $1`,
    [letterId],
  );
  return id;
}

describeWithDatabase("eraseSupporter", () => {
  useTestDatabase();

  it("deletes what each source holds, keeps what stops us mailing the address, blocks the Luma user from coming back, and logs it", async () => {
    const mp = await addTestMp();
    const id = await janeWithEverything(mp);

    expect(await eraseSupporter(id, "ICO-123", "jo@pauseai.uk")).toEqual({
      lumaUsers: 1,
      formEntries: 2,
      letters: 1,
      members: 1,
    });
    expect(await query("SELECT 1 FROM supporters WHERE id = $1", [id])).toEqual([]);
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM luma_guests WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM form_entries WHERE email = 'jane.fixture@example.com'")).toEqual([]);
    expect(await query("SELECT 1 FROM supporter_letters")).toEqual([]);
    expect(await query("SELECT 1 FROM form_entry_luma")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM letter_events")).toEqual([{ n: 0 }]);
    // The letter's own send and the copy to the shared inbox stay, without their letter; the one to Jane goes.
    expect(await query("SELECT address, letter_id FROM email_sends ORDER BY id")).toEqual([
      { address: "test-mp@example.org", letter_id: null },
      { address: "replies@example.org", letter_id: null },
    ]);
    expect(await query("SELECT count(*)::int AS n FROM email_problems")).toEqual([{ n: 1 }]);
    expect(await query("SELECT count(*)::int AS n FROM opt_outs WHERE address = 'jane.fixture@example.com'")).toEqual([
      { n: 1 },
    ]);
    expect(await query("SELECT user_id FROM luma_erased")).toEqual([{ user_id: "usr-fixture-1" }]);
    expect(await query("SELECT 1 FROM members WHERE email = 'jane.fixture@example.com'")).toEqual([]);
    expect(await query("SELECT id FROM members_erased")).toEqual([{ id: "recMemberJane" }]);
    expect(await query("SELECT actor, action, details FROM audit_log ORDER BY id DESC LIMIT 1")).toEqual([
      {
        actor: "jo@pauseai.uk",
        action: "erase supporter",
        details: { id, reference: "ICO-123", lumaUsers: 1, formEntries: 2, letters: 1, members: 1 },
      },
    ]);
    // Everyone else is still there, and the next import doesn't bring Jane back.
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 12 }]);
    await query("UPDATE luma_events SET guests_synced_at = NULL");
    await importLuma("test");
    await importMembers("test");
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM members WHERE id = 'recMemberJane'")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 12 }]);
  });

  it("does nothing for a supporter that doesn't exist", async () => {
    expect(await eraseSupporter(999, "ref", "jo@pauseai.uk")).toBeUndefined();
    expect(await query("SELECT count(*)::int AS n FROM audit_log")).toEqual([{ n: 0 }]);
  });
});
