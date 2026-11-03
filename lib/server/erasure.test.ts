import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { docFromMarkup } from "@/lib/letter-format";
import { addTestLetter, addTestMp, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { deliverToLettersInbox, lettersMailbox, resetLettersInbox } from "@/tests/fixtures/letters-inbox";
import { LETTERS_INBOX, stubLettersInboxEnv, testMail, testProxy } from "@/tests/gmail-sends";
import { readGmail } from "./gmail-reading";
import { submitLetter } from "./mp-letters";
import { letterReply } from "./outside-services/blobs";
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
    postmarkMailbox: "h1",
  });
  await query("INSERT INTO letter_events (letter_id, status, details) VALUES ($1, 'sent', '{}')", [letterId]);
  await query(
    `INSERT INTO email_sends (purpose, letter_id, address, outcome, message_id) VALUES
       ('letter', $1, 'test-mp@parliament.example', 'sent', 'm1'),
       ('forwarded-reply', $1, 'jane.fixture@example.com', 'sent', 'm2'),
       ('forwarded-reply', $1, 'policy@example.org', 'sent', 'm3')`,
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
    `SELECT k.supporter_id::int AS id FROM supporter_links k JOIN letters_from_supporters s ON s.entry_id = k.form_entry_id
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
    // She hosts the London protest.
    expect(await query("SELECT event_id FROM luma_event_hosts WHERE user_id = 'usr-fixture-1'")).toEqual([
      { event_id: "evt-fixture-london-protest" },
    ]);
    // A mailing that went to her.
    await query(
      `WITH m AS (
         INSERT INTO mailings (title, audience, channel, topic, filter, body, created_by, sent_from, from_name, due_at, state)
         VALUES ('Events', 'supporters', 'email', 'luma-calendar', '{}', '{}', 'jo@pauseai.uk', 'jo@pauseai.uk', 'PauseAI UK', now(), 'sent')
         RETURNING id)
       INSERT INTO messages_to_supporters (mailing_id, supporter_id, address, status, merge_values, sent_at)
       SELECT id, $1, 'jane.fixture@example.com', 'delivered', '{"name": "Jane"}', now() FROM m`,
      [id],
    );

    expect(await eraseSupporter(id, "ICO-123", "jo@pauseai.uk")).toEqual({
      lumaUsers: 1,
      formEntries: 2,
      letters: 1,
      members: 1,
      proxies: 0,
      messages: 0,
    });
    expect(await query("SELECT 1 FROM supporters WHERE id = $1", [id])).toEqual([]);
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM luma_guests WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    // Her event has one host fewer.
    expect(await query("SELECT 1 FROM luma_event_hosts WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM form_entries WHERE email = 'jane.fixture@example.com'")).toEqual([]);
    expect(await query("SELECT 1 FROM letters_from_supporters")).toEqual([]);
    expect(await query("SELECT 1 FROM form_entry_luma")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM letter_events")).toEqual([{ n: 0 }]);
    // The letter's own send and the copy to the shared inbox stay, without their letter; the one to Jane goes.
    expect(await query("SELECT address, letter_id FROM email_sends ORDER BY id")).toEqual([
      { address: "test-mp@parliament.example", letter_id: null },
      { address: "policy@example.org", letter_id: null },
    ]);
    expect(await query("SELECT count(*)::int AS n FROM email_problems")).toEqual([{ n: 1 }]);
    expect(await query("SELECT count(*)::int AS n FROM opt_outs WHERE address = 'jane.fixture@example.com'")).toEqual([
      { n: 1 },
    ]);
    expect(await query("SELECT user_id FROM luma_erased")).toEqual([{ user_id: "usr-fixture-1" }]);
    expect(await query("SELECT 1 FROM members WHERE email = 'jane.fixture@example.com'")).toEqual([]);
    expect(await query("SELECT id FROM members_erased")).toEqual([{ id: "recMemberJane" }]);
    // The message stays, as one delivered, without who to or what it said.
    expect(await query("SELECT supporter_id, address, merge_values, status FROM messages_to_supporters")).toEqual([
      { supporter_id: null, address: null, merge_values: null, status: "delivered" },
    ]);
    expect(await query("SELECT actor, action, details FROM audit_log ORDER BY id DESC LIMIT 1")).toEqual([
      {
        actor: "jo@pauseai.uk",
        action: "erase supporter",
        details: {
          id,
          reference: "ICO-123",
          lumaUsers: 1,
          formEntries: 2,
          letters: 1,
          members: 1,
          proxies: 0,
          messages: 0,
        },
      },
    ]);
    // Everyone else is still there, and the next import doesn't bring Jane back.
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 13 }]);
    await query("UPDATE luma_events SET guests_synced_at = NULL, hosts_synced_at = NULL");
    await importLuma("test");
    await importMembers("test");
    expect(await query("SELECT 1 FROM luma_people WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM luma_event_hosts WHERE user_id = 'usr-fixture-1'")).toEqual([]);
    expect(await query("SELECT 1 FROM members WHERE id = 'recMemberJane'")).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 13 }]);
  });

  describe("a letter from the letters inbox", () => {
    beforeEach(async () => {
      stubLettersInboxEnv();
      resetLettersInbox();
      vi.spyOn(console, "error").mockImplementation(() => {});
      await addTestMp();
      await connectTestGmail(LETTERS_INBOX);
    });
    afterEach(() => vi.restoreAllMocks());

    /** Jane's letter, and the office's reply to her proxy, kept and relayed. Returns her supporter ID. */
    async function janesLetter(): Promise<number> {
      await submitLetter({
        campaign: "regulate-letter-pm",
        name: "Jane Smith",
        postcode: "zz9 9zz",
        address: "1 High Street",
        email: "jane@example.com",
        subject: "Please back a pause",
        letter: docFromMarkup("Dear Mr McTestface,\n\nPlease back a pause."),
        draftHash: "",
        consent: false,
        nickname: "",
        turnstileToken: "",
      });
      deliverToLettersInbox(testMail({ from: "test-mp@parliament.example", to: testProxy("jane.smith") }));
      await readGmail("test");
      return (await query<{ id: number }>("SELECT supporter_id::int AS id FROM supporter_links"))[0].id;
    }

    it("deletes her proxy, her draft and every message kept, their blobs too, and moves the mail to Trash", async () => {
      const id = await janesLetter();
      const [{ key }] = await query<{ key: string }>("SELECT blob_key AS key FROM letter_replies");
      expect(await eraseSupporter(id, "ICO-124", "jo@pauseai.uk")).toMatchObject({
        letters: 1,
        proxies: 1,
        messages: 4,
      });
      expect(await query("SELECT tag FROM proxies")).toEqual([{ tag: "testy.mctestface.mp" }]);
      expect(await query("SELECT 1 FROM letter_replies")).toEqual([]);
      expect(await query("SELECT 1 FROM letter_relays")).toEqual([]);
      expect(await letterReply(key)).toBeUndefined();
      // Only the letter's own send stays, without its letter; the copy, the relay and the rest go.
      expect(await query("SELECT purpose FROM email_sends ORDER BY id")).toEqual([{ purpose: "letter" }]);
      // In the letters inbox, the office's reply, and her copy, which came back to the MP's proxy, are in Trash.
      expect(lettersMailbox().messages.map((m) => m.labels.has("TRASH"))).toEqual([true, true]);
    });

    it("is done all the same when the letters inbox can't be reached, saying so", async () => {
      const id = await janesLetter();
      await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
      expect(await eraseSupporter(id, "ICO-125", "jo@pauseai.uk")).toMatchObject({ proxies: 1 });
      expect(console.error).toHaveBeenCalledWith("Couldn't clear an erased supporter's mail:", expect.any(Error));
    });
  });

  it("does nothing for a supporter that doesn't exist", async () => {
    expect(await eraseSupporter(999, "ref", "jo@pauseai.uk")).toBeUndefined();
    expect(await query("SELECT count(*)::int AS n FROM audit_log")).toEqual([{ n: 0 }]);
  });
});
