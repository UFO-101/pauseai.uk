import { expect, it } from "vitest";
import { migrate } from "@/scripts/db-migrate.mjs";
import {
  addTestLetter,
  addTestMp,
  describeWithDatabase,
  MAKES_DATABASES,
  useDatabaseUpTo,
  useTestDatabase,
} from "@/tests/database";
import { query } from "./db";
import { addFormEntry } from "./form-entries";
import { linkSupporters } from "./supporters";

/** Every row each supporter view gives, in a fixed order, to compare before and after a migration. */
async function views() {
  return {
    identity: await query(
      "SELECT supporter_id::int AS id, source, email, name, seen_at FROM supporter_identity ORDER BY 1, 5, 2, 3",
    ),
    activity: await query(
      `SELECT supporter_id::int AS id, source, at, kind, title, detail, href, status FROM supporter_activity
       ORDER BY 1, 3, 4, 2, 5`,
    ),
    contact: await query(
      `SELECT supporter_id::int AS id, source, at, phone, postcode, latitude, longitude, city FROM supporter_contact
       ORDER BY 1, 3, 2, 5`,
    ),
    summary: await query(
      `SELECT id::int AS id, name, emails, phone, postcode, sources, luma_contact, first_seen_at, last_active_at,
         events, letters, member FROM supporters_summary ORDER BY 1`,
    ),
    firstSeen: await query("SELECT supporter_id::int AS id, first_seen_at FROM supporter_first_seen ORDER BY 1"),
    place: await query(
      "SELECT supporter_id::int AS id, place, country, basis, given, at FROM supporter_place ORDER BY 1",
    ),
    permissions: await query("SELECT topic, address, send, reason, at, source FROM email_permissions ORDER BY 1, 2"),
  };
}

type Row = Record<string, unknown>;

/**
 * A view's rows as the migration should leave them: a letter's source is its form, and the consent topic has its
 * new name. Supporter 2 is Wendy, who wrote through the old form.
 */
const renamed = (rows: Row[]): Row[] =>
  rows.map((row) => ({
    ...row,
    ...(row.source === "letter" && { source: row.id === 2 ? "web-form" : "email-your-mp" }),
    ...(row.topic === "events-and-ways-to-help" && { topic: "site-forms" }),
    ...(Array.isArray(row.sources) && {
      sources: (row.sources as string[]).map((s) => (s === "letter" ? "email-your-mp" : s)).sort(),
    }),
  }));

describeWithDatabase("migration 0043_form_entries", MAKES_DATABASES, () => {
  const db = useDatabaseUpTo("0042");

  it("makes each letter's sender a form entry, links the supporter to it, and every view says what it said", async () => {
    const [{ id: mp }] = await query<{ id: number }>(
      `INSERT INTO notable_people (kind, name, salutation, email) VALUES ('politician', 'Polly Placeholder', 'Ms Placeholder', 'polly@example.org')
       RETURNING id::int AS id`,
    );
    await query("INSERT INTO politicians (id, house, constituency) VALUES ($1, 'commons', 'Westminster')", [mp]);
    // Jane wrote twice through the site, agreeing then not; Wendy once through the old form, which asked for
    // no address and here no postcode; Sam's letter was never linked, as if the matcher hadn't run.
    const letter = async (
      created: string,
      sender: [name: string, email: string, address: string, postcode: string, consent: boolean],
      web?: string,
    ) => {
      const [{ id }] = await query<{ id: number }>(
        `INSERT INTO letters (kind, notable_person_id, status, created_at, sent_at, replied_at)
         VALUES ('supporter', $1, 'sent', $2, $2, CASE WHEN $3 THEN $2::timestamptz + interval '2 days' END)
         RETURNING id::int AS id`,
        [mp, created, sender[0] === "Jane Smith"],
      );
      await query(
        `INSERT INTO supporter_letters (id, campaign, sender_name, sender_email, sender_address, sender_postcode,
           contact_consent, subject, reply_hash, airtable_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'A letter', $8, $9)`,
        [id, web ? "pauseai-info-deepmind" : "regulate-letter-pm", ...sender, web ? null : `reply-${id}`, web ?? null],
      );
      return id;
    };
    const wendy = await letter("2025-07-20T09:00:00Z", ["Wendy Webform", "wendy@example.com", "", "", false], "recWeb");
    const jane1 = await letter("2026-10-01T10:00:00Z", [
      "Jane Smith",
      " Jane@Example.com ",
      "1 High St",
      "SW1A 1AA",
      true,
    ]);
    const jane2 = await letter("2026-10-05T10:00:00Z", ["Jane", "jane@example.com", "2 High St", "SW1A 2AA", false]);
    const sam = await letter("2026-10-06T10:00:00Z", ["Sam", "sam@example.com", "3 High St", "M1 1AE", true]);
    // Jane is on Luma and a member too, has unsubscribed from the calendar, and her first postcode has a place.
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude)
       VALUES ('evt-1', 'A meetup', 'meetup', '2026-09-20T18:00:00Z', 'manage', 'Leeds', 53.8, -1.55)`,
    );
    await query(
      "INSERT INTO luma_people (user_id, email, name, contact_since) VALUES ('usr-1', 'jane@example.com', 'Jane L', '2026-09-01T00:00:00Z')",
    );
    await query(
      `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone)
       VALUES ('gst-1', 'evt-1', 'usr-1', 'approved', '2026-09-10T00:00:00Z', '07700 900001')`,
    );
    await query(
      `INSERT INTO members (id, email, name, city, joined_at, created_at, keep_informed, share_permission, source_modified_at)
       VALUES ('recJane', 'jane@example.com', 'Jane M', 'York', '2026-08-01', '2026-08-01', true, true, '2026-08-01')`,
    );
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w1', '2026-10-02T00:00:00Z')`,
    );
    await query(
      "INSERT INTO postcode_places (postcode, latitude, longitude, place, country) VALUES ('SW1A2AA', 51.5, -0.13, 'Westminster', 'England')",
    );
    await query("INSERT INTO supporters (first_seen_at) VALUES ('2026-08-01'), ('2025-07-20T09:00:00Z')");
    await query(
      `INSERT INTO supporter_links (supporter_id, luma_user_id, letter_id, member_id, matched_by, matched_value) VALUES
         (1, 'usr-1', NULL, NULL, 'email', 'jane@example.com'),
         (1, NULL, $1, NULL, 'email', 'jane@example.com'),
         (1, NULL, $2, NULL, 'email', 'jane@example.com'),
         (1, NULL, NULL, 'recJane', 'email', 'jane@example.com'),
         (2, NULL, $3, NULL, 'email', 'wendy@example.com')`,
      [jane1, jane2, wendy],
    );
    const before = await views();
    // Something to compare: each view has rows from the letters.
    expect(before.identity.filter((row) => row.source === "letter")).toHaveLength(2);
    expect(before.identity.filter((row) => row.source === "web-form")).toHaveLength(1);
    expect(before.permissions.filter((row) => row.topic === "events-and-ways-to-help")).toHaveLength(3);

    expect(migrate(db.url, { appliedUpTo: "0042" })).toContain("0043_form_entries");

    // An entry per letter, with the letter's ID and date, its sender as given, blanks as nothing.
    expect(
      await query(
        `SELECT id::int AS id, form, created_at, name, email, phone, address, city, postcode, contact_consent, utm_source
         FROM form_entries ORDER BY id`,
      ),
    ).toEqual([
      {
        id: wendy,
        form: "web-form",
        created_at: new Date("2025-07-20T09:00:00Z"),
        name: "Wendy Webform",
        email: "wendy@example.com",
        phone: null,
        address: null,
        city: null,
        postcode: null,
        contact_consent: false,
        utm_source: null,
      },
      {
        id: jane1,
        form: "email-your-mp",
        created_at: new Date("2026-10-01T10:00:00Z"),
        name: "Jane Smith",
        email: " Jane@Example.com ",
        phone: null,
        address: "1 High St",
        city: null,
        postcode: "SW1A 1AA",
        contact_consent: true,
        utm_source: null,
      },
      expect.objectContaining({ id: jane2, form: "email-your-mp", email: "jane@example.com", contact_consent: false }),
      expect.objectContaining({ id: sam, form: "email-your-mp", address: "3 High St", postcode: "M1 1AE" }),
    ]);
    expect(
      await query("SELECT id::int AS id, entry_id::int AS entry FROM letters_from_supporters ORDER BY id"),
    ).toEqual([wendy, jane1, jane2, sam].map((id) => ({ id, entry: id })));
    // The sender's columns, and the links' letter column, are gone.
    expect(
      await query(
        `SELECT table_name, column_name FROM information_schema.columns
         WHERE (table_name = 'letters_from_supporters' AND (column_name LIKE 'sender_%' OR column_name = 'contact_consent'))
            OR (table_name = 'supporter_links' AND column_name = 'letter_id')`,
      ),
    ).toEqual([]);
    expect(
      await query(
        `SELECT supporter_id::int AS supporter, luma_user_id AS luma, form_entry_id::int AS entry, member_id AS member
         FROM supporter_links ORDER BY id`,
      ),
    ).toEqual([
      { supporter: 1, luma: "usr-1", entry: null, member: null },
      { supporter: 1, luma: null, entry: jane1, member: null },
      { supporter: 1, luma: null, entry: jane2, member: null },
      { supporter: 1, luma: null, entry: null, member: "recJane" },
      { supporter: 2, luma: null, entry: wendy, member: null },
    ]);

    // Every view says what it did, with each letter's source as its form, in history and contact details as in
    // identity, and the consent topic renamed. Wendy's
    // blank postcode was a postcode of '' before; now there's none.
    const after = await views();
    const blankPostcode = (rows: Row[]) => rows.map((row) => (row.postcode === "" ? { ...row, postcode: null } : row));
    expect(after.identity).toEqual(renamed(before.identity));
    expect(after.activity).toEqual(renamed(before.activity));
    expect(after.contact).toEqual(blankPostcode(renamed(before.contact)));
    expect(after.summary).toEqual(blankPostcode(renamed(before.summary)));
    expect(after.firstSeen).toEqual(before.firstSeen);
    expect(after.place).toEqual(before.place);
    // Permissions are by address, not supporter, so Wendy's form is found by hers; and the renamed topic sorts
    // in another place.
    const byTopic = (rows: Row[]) =>
      [...rows].sort((a, b) => `${a.topic} ${a.address}`.localeCompare(`${b.topic} ${b.address}`));
    expect(byTopic(after.permissions)).toEqual(
      byTopic(
        renamed(before.permissions).map((row) =>
          row.address === "wendy@example.com" && row.topic === "site-forms" ? { ...row, source: "web-form" } : row,
        ),
      ),
    );
    // The box on Jane's newer letter says no, as her letter did.
    expect(after.permissions).toContainEqual({
      topic: "site-forms",
      address: "jane@example.com",
      send: "no",
      reason: "declined",
      at: new Date("2026-10-05T10:00:00Z"),
      source: "email-your-mp",
    });

    // Sam's entry is linked the next time the matcher runs, and nobody else is linked twice.
    expect(await linkSupporters()).toEqual({ supportersAdded: 1, linked: 1 });
    expect(
      await query("SELECT supporter_id::int AS supporter FROM supporter_links WHERE form_entry_id = $1", [sam]),
    ).toEqual([{ supporter: 3 }]);

    // A new entry gets an ID after the letters', and an entry can't be deleted from under its letter.
    const [{ id: next }] = await query<{ id: number }>(
      `INSERT INTO form_entries (form, name, email, contact_consent) VALUES ('web-form', 'New', 'new@example.com', true)
       RETURNING id::int AS id`,
    );
    expect(next).toBeGreaterThan(sam);
    await expect(query("DELETE FROM form_entries WHERE id = $1", [jane1])).rejects.toThrow(/foreign key/);
    // An entry without a letter is a line of its own in the history, as its form.
    await linkSupporters();
    expect(await query("SELECT source, kind, title FROM supporter_activity WHERE kind = 'form-entry'")).toEqual([
      { source: "web-form", kind: "form-entry", title: "web-form" },
    ]);
  });
});

describeWithDatabase("migration 0044_form_entry_luma", MAKES_DATABASES, () => {
  const db = useDatabaseUpTo("0043");

  it("takes the march's entries, with what Luma said, as a line of the history; a letter's entry is still its letter", async () => {
    const [{ id: mp }] = await query<{ id: number }>(
      `INSERT INTO notable_people (kind, name) VALUES ('politician', 'Polly Placeholder') RETURNING id::int AS id`,
    );
    await query("INSERT INTO politicians (id, house) VALUES ($1, 'commons')", [mp]);
    await query(
      `INSERT INTO form_entries (id, form, created_at, name, email, contact_consent) OVERRIDING SYSTEM VALUE
       VALUES (1, 'email-your-mp', '2026-10-01', 'Jane', 'jane@example.com', true)`,
    );
    await query(
      `INSERT INTO letters (id, kind, notable_person_id, status, created_at) OVERRIDING SYSTEM VALUE
       VALUES (1, 'supporter', $1, 'sent', '2026-10-01')`,
      [mp],
    );
    await query(
      "INSERT INTO supporter_letters (id, entry_id, campaign, subject, reply_hash) VALUES (1, 1, 'regulate-letter-pm', 'S', 'r1')",
    );
    await expect(
      query(
        "INSERT INTO form_entries (form, name, email, contact_consent) VALUES ('march-2026-11', 'Sam', 'sam@example.com', true)",
      ),
    ).rejects.toThrow(/form_entries_form_check/);

    expect(migrate(db.url, { appliedUpTo: "0043" })).toContain("0044_form_entry_luma");

    const [{ id: sam }] = await query<{ id: number }>(
      `INSERT INTO form_entries (form, created_at, name, email, contact_consent, utm_source)
       VALUES ('march-2026-11', '2026-10-20', 'Sam', 'sam@example.com', true, 'nl') RETURNING id::int AS id`,
    );
    await query("INSERT INTO form_entry_luma (entry_id, event_id, status) VALUES ($1, 'evt-march', 'skipped')", [sam]);
    await query(
      "INSERT INTO form_entries (form, name, email, contact_consent) VALUES ('march-2026-11', 'Ali', 'ali@example.com', false)",
    );
    await linkSupporters();
    expect(await query("SELECT source, kind, title, detail, status FROM supporter_activity ORDER BY at, kind")).toEqual(
      [
        {
          source: "email-your-mp",
          kind: "letter",
          title: "regulate-letter-pm",
          detail: "Polly Placeholder",
          status: "sent",
        },
        { source: "march-2026-11", kind: "form-entry", title: "march-2026-11", detail: "nl", status: "skipped" },
        { source: "march-2026-11", kind: "form-entry", title: "march-2026-11", detail: null, status: null },
      ],
    );
    await expect(
      query("INSERT INTO form_entry_luma (entry_id, event_id, status) VALUES ($1, 'evt-march', 'maybe')", [sam]),
    ).rejects.toThrow();
    // What Luma said goes with its entry.
    await query("DELETE FROM form_entries WHERE id = $1", [sam]);
    expect(await query("SELECT * FROM form_entry_luma")).toEqual([]);
  });
});

describeWithDatabase("addFormEntry", () => {
  useTestDatabase();

  it("keeps an entry, links its supporter to the one with that email, and keeps what Luma said only if it was asked", async () => {
    await addTestLetter({ politicianId: await addTestMp(), senderEmail: "jane@example.com" });
    await linkSupporters();
    const entry = {
      name: "Jane",
      email: "Jane@Example.com",
      phone: "07700 900000",
      city: "Leeds",
      postcode: "LS1 1AA",
      consent: true,
      utmSource: null,
    };
    const id = await addFormEntry("march-2026-11", entry);
    expect(await query("SELECT * FROM form_entry_luma")).toEqual([]);
    expect(
      await query(`SELECT DISTINCT k.supporter_id::int AS id FROM supporter_links k WHERE k.form_entry_id IS NOT NULL`),
    ).toHaveLength(1);
    expect(await query("SELECT form, email, phone FROM form_entries WHERE id = $1", [id])).toEqual([
      { form: "march-2026-11", email: "Jane@Example.com", phone: "07700 900000" },
    ]);
    await addFormEntry("march-2026-11", entry, { eventId: "evt-march", status: "added" });
    expect(await query("SELECT event_id, status FROM form_entry_luma")).toEqual([
      { event_id: "evt-march", status: "added" },
    ]);
  });
});
