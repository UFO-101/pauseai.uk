import { expect, it } from "vitest";
import { query, transaction } from "@/lib/server/db";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import type { SupporterFilter } from "@/lib/supporters";
import { getSupporter, linkSupporters, listSupporters } from "./supporters";

/** A Luma user, with a registration for `event` if given. */
async function lumaUser(id: string, email: string, name: string, event?: string, more: Record<string, unknown> = {}) {
  await query("INSERT INTO luma_people (user_id, email, name, contact_since) VALUES ($1, $2, $3, $4)", [
    id,
    email,
    name,
    more.contactSince ?? null,
  ]);
  if (event) {
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude)
       VALUES ($1, $1, $1, '2026-10-01T18:00:00Z', 'manage', 'London', 51.5, -0.1) ON CONFLICT DO NOTHING`,
      [event],
    );
    await query(
      `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone, postcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        `gst-${id}-${event}`,
        event,
        id,
        more.status ?? "approved",
        more.registeredAt ?? "2026-09-20T10:00:00Z",
        more.phone ?? null,
        more.postcode ?? null,
      ],
    );
  }
}

async function letter(email: string, name: string, mp: number, more: Record<string, unknown> = {}): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, replied_at)
     VALUES ('regulate-letter-pm', $1, $2, $3, 'x', $4, true, 'S', $5, 'sent', $6, $7) RETURNING id::int AS id`,
    [
      mp,
      name,
      email,
      more.postcode ?? "ZZ9 9ZZ",
      `h-${email}-${Math.random()}`,
      more.createdAt ?? "2026-10-05T09:00:00Z",
      more.repliedAt ?? null,
    ],
  );
  return id;
}

const links = () =>
  query<{ supporter_id: number; luma_user_id: string | null; letter_id: number | null; matched_value: string }>(
    "SELECT supporter_id::int AS supporter_id, luma_user_id, letter_id::int AS letter_id, matched_value FROM supporter_links ORDER BY id",
  );

describeWithDatabase("linkSupporters", () => {
  useTestDatabase();

  it("makes one supporter per email across the sources, links every record, and does nothing the second time", async () => {
    const mp = await addTestMp();
    await lumaUser("usr-1", "jane@example.com", "Jane", "evt-1");
    await lumaUser("usr-2", "jane+luma@example.com", "Jane L");
    await lumaUser("usr-3", "", "Nobody");
    const janes = await letter(" Jane@Example.com ", "Jane Smith", mp);
    const sams = await letter("sam@example.com", "Sam", mp);

    expect(await linkSupporters()).toEqual({ supportersAdded: 3, linked: 4 });
    const rows = await links();
    const byValue = (value: string) => rows.filter((r) => r.matched_value === value).map((r) => r.supporter_id);
    expect(new Set(byValue("jane@example.com")).size).toBe(1);
    expect(rows.find((r) => r.luma_user_id === "usr-1")!.supporter_id).toBe(
      rows.find((r) => r.letter_id === janes)!.supporter_id,
    );
    expect(byValue("jane+luma@example.com")).not.toContain(byValue("jane@example.com")[0]);
    expect(rows.find((r) => r.letter_id === sams)).toBeDefined();
    expect(rows.find((r) => r.luma_user_id === "usr-3")).toBeUndefined();
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 3 }]);

    expect(await linkSupporters()).toEqual({ supportersAdded: 0, linked: 0 });
    expect(await links()).toEqual(rows);
  });

  it("links a new record on a known email to that supporter, inside a given transaction", async () => {
    const mp = await addTestMp();
    await lumaUser("usr-1", "jane@example.com", "Jane");
    await linkSupporters();
    const [{ supporter_id }] = await links();
    const second = await letter("jane@example.com", "Jane", mp);
    await lumaUser("usr-4", "jane@example.com", "Jane again");
    expect(await transaction((db) => linkSupporters(db))).toEqual({ supportersAdded: 0, linked: 2 });
    expect((await links()).map((r) => r.supporter_id)).toEqual([supporter_id, supporter_id, supporter_id]);
    expect((await links()).find((r) => r.letter_id === second)).toBeDefined();
  });

  it("gives the views each supporter's name, emails, contact details, activity and opt-outs", async () => {
    const mp = await addTestMp();
    await lumaUser("usr-1", "jane@example.com", "Jane L", "evt-1", {
      contactSince: "2026-08-01T00:00:00Z",
      phone: "+447700900001",
      postcode: "M1 1AE",
    });
    await lumaUser("usr-1b", "jane@example.com", "Jane Declined", "evt-2", {
      status: "declined",
      registeredAt: "2026-09-25T10:00:00Z",
    });
    await letter("jane@example.com", "Jane Smith", mp, {
      postcode: "SW1A 1AA",
      createdAt: "2026-10-05T09:00:00Z",
      repliedAt: "2026-10-06T09:00:00Z",
    });
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at)
       VALUES ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w1', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z'),
              ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w2', '2026-10-07T00:00:00Z', NULL)`,
    );
    await linkSupporters();

    const [summary] = await query("SELECT * FROM supporters_summary");
    expect(summary).toMatchObject({
      name: "Jane Smith",
      emails: ["jane@example.com"],
      phone: "+447700900001",
      postcode: "SW1A 1AA",
      sources: ["letter", "luma"],
      luma_contact: true,
      first_seen_at: new Date("2026-08-01T00:00:00Z"),
      last_active_at: new Date("2026-10-07T00:00:00Z"),
      events: 1,
      letters: 1,
      opted_out: ["luma-calendar"],
    });
    const activity = await query<{
      source: string;
      kind: string;
      title: string | null;
      detail: string | null;
      href: string | null;
      status: string | null;
    }>("SELECT source, kind, title, detail, href, status FROM supporter_activity ORDER BY at");
    expect(activity).toEqual([
      { source: "luma", kind: "luma-contact", title: null, detail: null, href: null, status: null },
      {
        source: "luma-webhook",
        kind: "opted-out",
        title: "luma-calendar",
        detail: "jane@example.com",
        href: null,
        status: null,
      },
      {
        source: "luma-webhook",
        kind: "resubscribed",
        title: "luma-calendar",
        detail: "jane@example.com",
        href: null,
        status: null,
      },
      {
        source: "luma",
        kind: "luma-registered",
        title: "evt-1",
        detail: "approved",
        href: "https://luma.com/evt-1",
        status: null,
      },
      {
        source: "luma",
        kind: "luma-registered",
        title: "evt-2",
        detail: "declined",
        href: "https://luma.com/evt-2",
        status: null,
      },
      {
        source: "letter",
        kind: "letter",
        title: "regulate-letter-pm",
        detail: "Testy McTestface MP",
        href: `/staff/politicians/${mp}`,
        status: "sent",
      },
      {
        source: "letter",
        kind: "letter-replied",
        title: "regulate-letter-pm",
        detail: "Testy McTestface MP",
        href: `/staff/politicians/${mp}`,
        status: null,
      },
      {
        source: "luma-webhook",
        kind: "opted-out",
        title: "luma-calendar",
        detail: "jane@example.com",
        href: null,
        status: null,
      },
    ]);
    expect(await query("SELECT source, phone, postcode, latitude FROM supporter_contact ORDER BY at")).toEqual([
      { source: "luma", phone: "+447700900001", postcode: "M1 1AE", latitude: 51.5 },
      { source: "luma", phone: null, postcode: null, latitude: 51.5 },
      { source: "letter", phone: null, postcode: "SW1A 1AA", latitude: null },
    ]);
  });

  it("a supporter from a letter alone has no name until one is given, and a removed guest's event doesn't count", async () => {
    const mp = await addTestMp();
    await letter("sam@example.com", "", mp);
    await lumaUser("usr-5", "pat@example.com", "Pat", "evt-9");
    await query("UPDATE luma_guests SET removed_at = now()");
    await linkSupporters();
    const rows = await query<{ name: string | null; events: number; opted_out: string[] | null }>(
      "SELECT name, events, opted_out FROM supporters_summary ORDER BY id",
    );
    expect(rows).toEqual([
      { name: null, events: 0, opted_out: null },
      { name: "Pat", events: 0, opted_out: null },
    ]);
  });
});

describeWithDatabase("listSupporters and getSupporter", () => {
  useTestDatabase();

  async function people() {
    const mp = await addTestMp();
    await lumaUser("usr-1", "jane@example.com", "Jane", "evt-1", {
      contactSince: "2026-01-01T00:00:00Z",
      registeredAt: "2026-10-10T10:00:00Z",
      phone: "+447700900001",
      postcode: "M1 1AE",
    });
    await lumaUser("usr-2", "sam@example.com", "Sam", "evt-1", { registeredAt: "2025-01-10T10:00:00Z" });
    await lumaUser("usr-3", "old@example.com", "Old", "evt-1", { registeredAt: "2024-01-10T10:00:00Z" });
    await letter("pat@example.com", "Pat", mp, { createdAt: "2026-06-01T09:00:00Z" });
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('sam@example.com', 'luma-calendar', 'luma-webhook', 'w1', '2026-10-12T00:00:00Z')`,
    );
    await linkSupporters();
    await query("UPDATE luma_guests SET registered_at = '2024-01-10T10:00:00Z' WHERE user_id = 'usr-3'");
  }
  const names = async (filter: Partial<SupporterFilter>) =>
    (await listSupporters({ sort: "active", dir: "desc", page: 1, ...filter })).supporters.map((s) => s.name);

  it("lists everyone newest activity first, with what's known of each, and pages", async () => {
    await people();
    const page = await listSupporters({ sort: "active", dir: "desc", page: 1 });
    expect(page.total).toBe(4);
    expect(page.pages).toBe(1);
    expect(page.supporters.map((s) => s.name)).toEqual(["Sam", "Jane", "Pat", "Old"]);
    expect(page.supporters[1]).toEqual({
      id: expect.any(Number),
      name: "Jane",
      emails: ["jane@example.com"],
      phone: "+447700900001",
      postcode: "M1 1AE",
      sources: ["luma"],
      lumaContact: true,
      firstSeenAt: new Date("2026-01-01T00:00:00Z"),
      lastActiveAt: new Date("2026-10-10T10:00:00Z"),
      events: 1,
      letters: 0,
      optedOut: [],
      member: false,
      intent: null,
    });
    expect(page.supporters[0].optedOut).toEqual(["luma-calendar"]);
    expect(await listSupporters({ sort: "active", dir: "desc", page: 2 })).toEqual({
      supporters: [],
      total: 0,
      pages: 1,
    });
  });

  it("filters by name, email or phone, source, registration, activity, first sign-up, opt-outs and postcode, and sorts", async () => {
    await people();
    expect(await names({ search: "JANE" })).toEqual(["Jane"]);
    expect(await names({ search: "pat@" })).toEqual(["Pat"]);
    expect(await names({ search: "0900001" })).toEqual(["Jane"]);
    expect(await names({ source: "letter" })).toEqual(["Pat"]);
    expect(await names({ registered: true })).toEqual(["Sam", "Jane", "Old"]);
    expect(await names({ unsubscribed: true })).toEqual(["Sam"]);
    expect(await names({ from: "2026-06-01", to: "2026-06-01" })).toEqual(["Pat"]);
    expect(await names({ from: "2026-06-02" })).toEqual([]);
    expect(await names({ to: "2025-12-31" })).toEqual(["Sam", "Old"]);
    expect(await names({ sort: "first", dir: "asc" })).toEqual(["Old", "Sam", "Jane", "Pat"]);
    expect(await names({ sort: "first", dir: "desc" })).toEqual(["Pat", "Jane", "Sam", "Old"]);
    expect(await names({ sort: "name", dir: "asc" })).toEqual(["Jane", "Old", "Pat", "Sam"]);
    expect(await names({ sort: "name", dir: "desc" })).toEqual(["Sam", "Pat", "Old", "Jane"]);
    expect(await names({ sort: "events", dir: "desc" })).toEqual(["Sam", "Jane", "Old", "Pat"]);
    expect(await names({ sort: "letters", dir: "desc" })).toEqual(["Pat", "Sam", "Jane", "Old"]);
    expect(await names({ sort: "active", dir: "asc" })).toEqual(["Old", "Pat", "Jane", "Sam"]);
  });

  it("filters by how recently they were active, against the clock", async () => {
    const mp = await addTestMp();
    const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
    await letter("a@example.com", "Week", mp, { createdAt: at(7) });
    await letter("b@example.com", "Season", mp, { createdAt: at(60) });
    await letter("c@example.com", "Year", mp, { createdAt: at(200) });
    await letter("d@example.com", "Ages", mp, { createdAt: at(400) });
    await linkSupporters();
    expect(await names({ active: "30" })).toEqual(["Week"]);
    expect(await names({ active: "90" })).toEqual(["Week", "Season"]);
    expect(await names({ active: "365" })).toEqual(["Week", "Season", "Year"]);
    expect(await names({ active: "older" })).toEqual(["Ages"]);
  });

  it("gives one supporter's details: identities, contact details, links, activity and each list's opt-out", async () => {
    await people();
    const [{ id }] = await query<{ id: number }>(
      "SELECT supporter_id::int AS id FROM supporter_links WHERE luma_user_id = 'usr-2'",
    );
    const sam = (await getSupporter(id))!;
    expect(sam.summary.name).toBe("Sam");
    expect(sam.identities).toEqual([
      { source: "luma", email: "sam@example.com", name: "Sam", seenAt: new Date("2025-01-10T10:00:00Z") },
    ]);
    expect(sam.contacts).toEqual([
      {
        source: "luma",
        at: new Date("2025-01-10T10:00:00Z"),
        phone: null,
        postcode: null,
        latitude: 51.5,
        longitude: -0.1,
        city: "London",
      },
    ]);
    expect(sam.links).toEqual([
      {
        source: "luma",
        sourceId: "usr-2",
        matchedBy: "email",
        matchedValue: "sam@example.com",
        linkedAt: expect.any(Date),
      },
    ]);
    expect(sam.activity.map((a) => a.kind)).toEqual(["opted-out", "luma-registered"]);
    expect(sam.optOuts).toEqual([
      {
        list: "luma-calendar",
        address: "sam@example.com",
        status: "unsubscribed",
        at: new Date("2026-10-12T00:00:00Z"),
        source: "luma-webhook",
      },
    ]);
    expect(sam.members).toEqual([]);

    const [{ id: pat }] = await query<{ id: number }>(
      "SELECT supporter_id::int AS id FROM supporter_links WHERE letter_id IS NOT NULL",
    );
    const details = (await getSupporter(pat))!;
    expect(details.links[0]).toMatchObject({ source: "letter", sourceId: expect.stringMatching(/^\d+$/) });
    expect(details.optOuts).toEqual([
      { list: "luma-calendar", address: "pat@example.com", status: "subscribed", at: null, source: null },
    ]);
    expect(details.contacts).toEqual([
      {
        source: "letter",
        at: new Date("2026-06-01T09:00:00Z"),
        phone: null,
        postcode: "ZZ9 9ZZ",
        latitude: null,
        longitude: null,
        city: null,
      },
    ]);
    expect(await getSupporter(999)).toBeUndefined();
  });
});

/** A member's record, joined on `created`, ticking "Keep me informed" unless told otherwise. */
async function member(id: string, email: string, created: string, more: Record<string, unknown> = {}) {
  await query(
    `INSERT INTO members (id, email, name, phone, city, postcode, joined_at, created_at, keep_informed, share_permission,
       source_page, intent, source_modified_at, removed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $8, $12)`,
    [
      id,
      email,
      more.name ?? "A Member",
      more.phone ?? null,
      more.city ?? null,
      more.postcode ?? null,
      more.joinedAt ?? created,
      created,
      more.keepInformed ?? true,
      more.sourcePage ?? null,
      more.intent ?? null,
      more.removedAt ?? null,
    ],
  );
}

/** The supporter with this address. */
async function supporterWith(email: string): Promise<number> {
  const [{ id }] = await query<{ id: number }>(
    "SELECT supporter_id::int AS id FROM supporter_links WHERE matched_value = $1 LIMIT 1",
    [email],
  );
  return id;
}

describeWithDatabase("members as supporters", () => {
  useTestDatabase();

  it("links a member to the supporter with their email, with their city, joining and what they chose", async () => {
    const mp = await addTestMp();
    await letter("jane@example.com", "Jane Smith", mp, { createdAt: "2026-10-05T09:00:00Z" });
    await member("recJane", "jane@example.com", "2026-09-12T10:00:00Z", {
      name: "Jane M",
      joinedAt: "2024-03-23T00:00:00Z",
      phone: "+447700900123",
      city: "Manchester",
      sourcePage: "pauseai.uk",
      intent: "Volunteer",
    });
    expect(await linkSupporters()).toEqual({ supportersAdded: 1, linked: 2 });
    const jane = (await getSupporter(await supporterWith("jane@example.com")))!;
    expect(jane.summary).toMatchObject({
      sources: ["letter", "member"],
      member: true,
      intent: "Volunteer",
      phone: "+447700900123",
      firstSeenAt: new Date("2024-03-23T00:00:00Z"),
    });
    expect(jane.contacts).toContainEqual({
      source: "member",
      at: new Date("2026-09-12T10:00:00Z"),
      phone: "+447700900123",
      postcode: null,
      latitude: null,
      longitude: null,
      city: "Manchester",
    });
    expect(jane.members).toEqual([
      {
        id: "recJane",
        email: "jane@example.com",
        joinedAt: new Date("2024-03-23T00:00:00Z"),
        createdAt: new Date("2026-09-12T10:00:00Z"),
        sourcePage: "pauseai.uk",
        intent: "Volunteer",
        keepInformed: true,
        removed: false,
      },
    ]);
    expect(jane.activity).toContainEqual({
      source: "member",
      at: new Date("2024-03-23T00:00:00Z"),
      kind: "member-joined",
      title: "Volunteer",
      detail: "pauseai.uk",
      href: "https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/recJane",
      status: null,
    });
    expect(jane.links.map((l) => l.source).sort()).toEqual(["letter", "member"]);

    // A member no longer read is no longer one, though what they gave stays.
    await query("UPDATE members SET removed_at = now()");
    const removed = (await getSupporter(await supporterWith("jane@example.com")))!;
    expect(removed.summary).toMatchObject({ member: false, intent: null, sources: ["letter", "member"] });
    expect(removed.members[0].removed).toBe(true);
    expect(removed.optOuts.map((o) => o.list)).toEqual(["luma-calendar"]);
  });

  it("says where each member's address stands on the updates, and why", async () => {
    await member("recAsked", "asked@example.com", "2026-09-12T10:00:00Z");
    await member("recDeclined", "declined@example.com", "2026-09-12T10:00:00Z", { keepInformed: false });
    await member("recNotYet", "notyet@example.com", "2026-09-12T10:00:00Z", { keepInformed: false });
    await member("recRequired", "required@example.com", "2026-03-03T10:00:00Z", { keepInformed: true });
    await member("recUnasked", "unasked@example.com", "2025-11-29T10:00:00Z", { keepInformed: false });
    await member("recRejoined", "rejoined@example.com", "2026-10-11T08:00:00Z");
    await member("recOther", "other@example.com", "2026-09-12T10:00:00Z");
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
         ('declined@example.com', 'pauseai-updates', 'airtable-import', 'recDeclined', '2026-09-12T10:00:00Z', NULL),
         ('rejoined@example.com', 'pauseai-updates', 'airtable-import', 'recOld', '2026-07-10T00:00:00Z', '2026-10-11T08:00:00Z'),
         ('other@example.com', 'pauseai-updates', 'airtable-import', 'recOld2', '2026-07-10T00:00:00Z', '2026-08-01T00:00:00Z'),
         ('other@example.com', 'pauseai-updates', 'airtable-import', 'recOld3', '2026-07-11T00:00:00Z', '2026-08-02T00:00:00Z')`,
    );
    await linkSupporters();
    const updates = async (email: string) =>
      (await getSupporter(await supporterWith(email)))!.optOuts.filter((o) => o.list === "pauseai-updates");
    const at = (iso: string) => new Date(iso);
    expect(await updates("asked@example.com")).toMatchObject([{ status: "asked", at: at("2026-09-12T10:00:00Z") }]);
    expect(await updates("declined@example.com")).toMatchObject([
      { status: "declined", at: at("2026-09-12T10:00:00Z"), source: "airtable-import" },
    ]);
    // Unticked, before the import has recorded its opt-out.
    expect(await updates("notyet@example.com")).toMatchObject([{ status: "declined", source: null }]);
    expect(await updates("required@example.com")).toMatchObject([{ status: "required" }]);
    expect(await updates("unasked@example.com")).toMatchObject([{ status: "unasked" }]);
    expect(await updates("rejoined@example.com")).toMatchObject([
      { status: "rejoined", at: at("2026-10-11T08:00:00Z") },
    ]);
    // Of two lifted, the newest.
    expect(await updates("other@example.com")).toMatchObject([{ status: "rejoined", at: at("2026-08-02T00:00:00Z") }]);
  });
});
