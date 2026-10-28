import { expect, it } from "vitest";
import { query, transaction } from "@/lib/server/db";
import { addTestLetter, addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import type { SupporterFilter } from "@/lib/supporters";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { refreshSupportersList } from "./supporter-facts";
import { eventChoices, getSupporter, linkSupporters, listSupporters } from "./supporters";

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
  return addTestLetter({
    politicianId: mp,
    senderName: name,
    senderEmail: email,
    senderPostcode: (more.postcode as string | undefined) ?? "ZZ9 9ZZ",
    contactConsent: true,
    replyHash: `h-${email}-${Math.random()}`,
    createdAt: (more.createdAt as string | undefined) ?? "2026-10-05T09:00:00Z",
    repliedAt: (more.repliedAt as string | undefined) ?? null,
  });
}

/** Each link, with the letter its form entry sent, if it sent one. */
const links = () =>
  query<{ supporter_id: number; luma_user_id: string | null; letter_id: number | null; matched_value: string }>(
    `SELECT k.supporter_id::int AS supporter_id, k.luma_user_id, s.id::int AS letter_id, k.matched_value
     FROM supporter_links k LEFT JOIN supporter_letters s ON s.entry_id = k.form_entry_id ORDER BY k.id`,
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
    // Each is first seen by their earliest record; Jane L by none, with neither a contact date nor a registration.
    expect(
      await query(
        "SELECT s.first_seen_at AS at FROM supporters s JOIN supporter_first_seen f ON f.supporter_id = s.id WHERE s.first_seen_at IS DISTINCT FROM f.first_seen_at",
      ),
    ).toEqual([]);
    expect(await query("SELECT count(first_seen_at)::int AS n FROM supporters")).toEqual([{ n: 2 }]);

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

  it("gives the views each supporter's name, emails, contact details, activity and opt-outs in their history", async () => {
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
      sources: ["email-your-mp", "luma"],
      // A contact, but not now: her second opt-out is still open.
      luma_contact: false,
      first_seen_at: new Date("2026-08-01T00:00:00Z"),
      last_active_at: new Date("2026-10-07T00:00:00Z"),
      events: 1,
      letters: 1,
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
        source: "email-your-mp",
        kind: "letter",
        title: "regulate-letter-pm",
        detail: "Testy McTestface MP",
        href: `/staff/politicians/${mp}`,
        status: "sent",
      },
      {
        source: "email-your-mp",
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
      { source: "email-your-mp", phone: null, postcode: "SW1A 1AA", latitude: null },
    ]);
  });

  it("a supporter from a letter alone has no name until one is given, and a removed guest's event doesn't count", async () => {
    const mp = await addTestMp();
    await letter("sam@example.com", "", mp);
    await lumaUser("usr-5", "pat@example.com", "Pat", "evt-9");
    await query("UPDATE luma_guests SET removed_at = now()");
    await linkSupporters();
    const rows = await query<{ name: string | null; events: number }>(
      "SELECT name, events FROM supporters_summary ORDER BY id",
    );
    expect(rows).toEqual([
      { name: null, events: 0 },
      { name: "Pat", events: 0 },
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
    // Sam was a contact, but unsubscribed, so isn't one now.
    await lumaUser("usr-2", "sam@example.com", "Sam", "evt-1", {
      registeredAt: "2025-01-10T10:00:00Z",
      contactSince: "2025-01-10T10:00:00Z",
    });
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
      email: "jane@example.com",
      phone: "+447700900001",
      phones: ["+447700900001"],
      postcode: "M1 1AE",
      sources: ["luma"],
      lumaContact: true,
      firstSeenAt: new Date("2026-01-01T00:00:00Z"),
      lastActiveAt: new Date("2026-10-10T10:00:00Z"),
      events: 1,
      letters: 0,
      member: false,
      place: { name: "London", basis: "event", given: "evt-1", country: null },
      permissions: [
        {
          topic: "luma-calendar",
          channel: "email",
          address: "jane@example.com",
          send: "yes",
          reason: "following",
          at: "2026-01-01T00:00:00+00:00",
          source: "luma",
        },
        {
          topic: "luma-calendar",
          channel: "phone",
          address: "+447700900001",
          send: "yes",
          reason: "following",
          at: "2026-01-01T00:00:00+00:00",
          source: "luma",
        },
      ],
    });
    // A page past the end has no one on it, but still says how many there are.
    expect(await listSupporters({ sort: "active", dir: "desc", page: 2 })).toEqual({
      supporters: [],
      total: 4,
      pages: 1,
    });
  });

  it("lists everyone as of the last refresh, and anyone added since as they are now", async () => {
    await people();
    await refreshSupportersList();
    await query("UPDATE luma_people SET name = 'Janet' WHERE user_id = 'usr-1'");
    await lumaUser("usr-4", "lee@example.com", "Lee", "evt-1", { registeredAt: "2026-10-15T10:00:00Z" });
    await linkSupporters();
    const listed = await names({});
    expect(listed[0]).toBe("Lee");
    expect(listed).toContain("Jane");
    expect((await listSupporters({ sort: "active", dir: "desc", page: 1 })).total).toBe(5);
    // A supporter's own page is as they are now.
    const [{ id }] = await query<{ id: number }>(
      "SELECT supporter_id::int AS id FROM supporter_links WHERE luma_user_id = 'usr-1'",
    );
    expect((await getSupporter(id))!.summary.name).toBe("Janet");
    await refreshSupportersList();
    expect(await names({})).toContain("Janet");
  });

  it("shows an opt-out from the Luma calendar, and its end, at once, between refreshes", async () => {
    await people();
    await refreshSupportersList();
    const contacts = () => names({ activity: ["lumaContact"] });
    expect(await contacts()).toEqual(["Jane"]);
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w2', '2026-10-15T00:00:00Z')`,
    );
    expect(await contacts()).toEqual([]);
    expect(
      (await listSupporters({ sort: "active", dir: "desc", page: 1 })).supporters.find((s) => s.name === "Jane")!
        .lumaContact,
    ).toBe(false);
    await query("UPDATE opt_outs SET resubscribed_at = '2026-10-16T00:00:00Z' WHERE source_ref = 'w2'");
    expect(await contacts()).toEqual(["Jane"]);
  });

  it("filters by name, email or phone, activities, subscriptions, first sign-up and postcode, and sorts", async () => {
    await people();
    expect(await names({ search: "JANE" })).toEqual(["Jane"]);
    expect(await names({ search: "jáne 0900001" })).toEqual(["Jane"]);
    expect(await names({ search: "jane pat" })).toEqual([]);
    expect(await names({ search: "pat@" })).toEqual(["Pat"]);
    expect(await names({ search: "0900001" })).toEqual(["Jane"]);
    expect(await names({ activity: ["letter"] })).toEqual(["Pat"]);
    expect(await names({ activity: ["registered"] })).toEqual(["Sam", "Jane", "Old"]);
    expect(await names({ activity: ["lumaContact"] })).toEqual(["Jane"]);
    expect(await names({ activity: ["member"] })).toEqual([]);
    expect(await names({ activity: ["letter", "lumaContact"] })).toEqual(["Jane", "Pat"]);
    const unsubscribed = [{ channel: "email", topic: "luma-calendar", reason: "unsubscribed" }] as const;
    expect(await names({ subscription: [...unsubscribed] })).toEqual(["Sam"]);
    expect(
      await names({ subscription: [{ channel: "email", topic: "luma-calendar", reason: "not-following" }] }),
    ).toEqual(["Old"]);
    expect(await names({ subscription: [{ channel: "email", topic: "site-forms", reason: "asked" }] })).toEqual([
      "Pat",
    ]);
    expect(
      await names({ subscription: [...unsubscribed, { channel: "email", topic: "site-forms", reason: "asked" }] }),
    ).toEqual(["Sam", "Pat"]);
    // Leaving "Keep me informed" unticked isn't an unsubscribe.
    await query(
      `INSERT INTO members (id, email, name, joined_at, created_at, keep_informed, share_permission, source_modified_at)
       VALUES ('recOld', 'old@example.com', 'Old', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', false, true, '2026-09-01T00:00:00Z')`,
    );
    expect(await names({ subscription: [...unsubscribed] })).toEqual(["Sam"]);
    expect(await names({ subscription: [{ channel: "email", topic: "pauseai-updates", reason: "declined" }] })).toEqual(
      ["Old"],
    );
    // A block is every topic's answer, and outranks the unsubscribe.
    await query(
      `WITH p AS (INSERT INTO email_problems (address, kind, at, can_reset) VALUES ('sam@example.com', 'hard', '2026-10-13T00:00:00Z', false) RETURNING id)
       INSERT INTO email_blocks (address, problem_id) SELECT 'sam@example.com', id FROM p`,
    );
    expect(await names({ subscription: [{ channel: "email", reason: "blocked" }] })).toEqual(["Sam"]);
    expect(await names({ subscription: [...unsubscribed] })).toEqual([]);
    expect(await names({ sort: "first", dir: "asc" })).toEqual(["Old", "Sam", "Jane", "Pat"]);
    expect(await names({ sort: "first", dir: "desc" })).toEqual(["Pat", "Jane", "Sam", "Old"]);
    expect(await names({ sort: "name", dir: "asc" })).toEqual(["Jane", "Old", "Pat", "Sam"]);
    expect(await names({ sort: "name", dir: "desc" })).toEqual(["Sam", "Pat", "Old", "Jane"]);
    expect(await names({ sort: "events", dir: "desc" })).toEqual(["Sam", "Jane", "Old", "Pat"]);
    expect(await names({ sort: "letters", dir: "desc" })).toEqual(["Pat", "Sam", "Jane", "Old"]);
    expect(await names({ sort: "active", dir: "asc" })).toEqual(["Old", "Pat", "Jane", "Sam"]);
  });

  it("shows the newest number we may use, and finds supporters by their numbers' answers", async () => {
    await people();
    const jane = async () =>
      (await listSupporters({ sort: "active", dir: "desc", page: 1 })).supporters.find((s) => s.name === "Jane")!;
    // Jane gave Luma her number; once she unsubscribes from the calendar, it's one we may not use.
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('jane@example.com', 'luma-calendar', 'luma-webhook', 'w3', '2026-10-15T00:00:00Z')`,
    );
    expect(await jane()).toMatchObject({ phone: null, phones: ["+447700900001"] });
    expect(await names({ phone: true })).toEqual([]);
    const lumaPhone = { channel: "phone", topic: "luma-calendar" } as const;
    expect(await names({ subscription: [{ ...lumaPhone, reason: "unsubscribed" }] })).toEqual(["Jane"]);
    expect(await names({ subscription: [{ ...lumaPhone, reason: "following" }] })).toEqual([]);
    // The same number given on joining as a volunteer is one we may use; a number found by email or phone.
    await member("recJane", "jane@example.com", "2026-09-01T00:00:00Z", {
      name: "Jane",
      phone: "07700 900001",
      intent: "Volunteer",
    });
    await linkSupporters();
    expect(await jane()).toMatchObject({ phone: "+447700900001" });
    expect(await names({ phone: true })).toEqual(["Jane"]);
    const volunteered = { channel: "phone", topic: "volunteering", reason: "volunteered" } as const;
    expect(await names({ subscription: [volunteered] })).toEqual(["Jane"]);
    expect(
      await names({ subscription: [volunteered, { channel: "email", topic: "site-forms", reason: "asked" }] }),
    ).toEqual(["Jane", "Pat"]);
    // Her page has each number once, as phone_number() writes it.
    const details = (await getSupporter((await jane()).id))!;
    expect([...new Set(details.contacts.map((c) => c.phone).filter(Boolean))]).toEqual(["+447700900001"]);
    expect(details.permissions.filter((p) => p.channel === "phone").map((p) => [p.topic, p.send])).toEqual([
      ["luma-calendar", "no"],
      ["volunteering", "yes"],
    ]);
  });

  it("filters by phone and email, events, campaigns, nation and nearness, and places each", async () => {
    await people();
    expect(await names({ phone: true })).toEqual(["Jane"]);
    expect(await names({ phone: false })).toEqual(["Sam", "Pat", "Old"]);
    expect(await names({ email: true })).toEqual(["Sam", "Jane", "Pat", "Old"]);
    expect(await names({ email: false })).toEqual([]);
    expect(await names({ event: ["evt-1"] })).toEqual(["Sam", "Jane", "Old"]);
    expect(await names({ event: ["evt-none", "evt-1"] })).toEqual(["Sam", "Jane", "Old"]);
    expect(await names({ event: ["evt-none"] })).toEqual([]);
    expect(await eventChoices()).toEqual([{ id: "evt-1", name: "evt-1", startAt: new Date("2026-10-01T18:00:00Z") }]);
    const [{ campaign }] = await query<{ campaign: string }>("SELECT campaign FROM supporter_letters LIMIT 1");
    expect(await names({ campaign, wrote: true })).toEqual(["Pat"]);
    expect(await names({ campaign, wrote: false })).toEqual(["Sam", "Jane", "Old"]);
    // Jane's postcode places her in Manchester; the others' events are in London.
    await query(
      `INSERT INTO postcode_places (postcode, latitude, longitude, place, country)
       VALUES ('M11AE', 53.4794, -2.2353, 'Manchester', 'england')`,
    );
    const page = await listSupporters({ sort: "name", dir: "asc", page: 1 });
    expect(page.supporters.map((s) => [s.name, s.place?.name, s.place?.basis])).toEqual([
      ["Jane", "Manchester", "postcode"],
      ["Old", "London", "event"],
      ["Pat", undefined, undefined],
      ["Sam", "London", "event"],
    ]);
    expect(await names({ country: ["england"] })).toEqual(["Jane"]);
    expect(await names({ country: ["wales"] })).toEqual([]);
    // Manchester is within 50 miles of Leeds, but not 25; London is neither. A place postcodes.io doesn't know finds no one.
    const near = await listSupporters({ sort: "name", dir: "asc", page: 1, near: { text: "Leeds", miles: 50 } });
    expect(near.near).toMatchObject({ place: "Leeds" });
    expect(near.supporters.map((s) => s.name)).toEqual(["Jane"]);
    expect(await names({ near: { text: "Leeds", miles: 25 } })).toEqual([]);
    const nowhere = await listSupporters({ sort: "name", dir: "asc", page: 1, near: { text: "Atlantis", miles: 50 } });
    expect(nowhere).toMatchObject({ total: 0, near: null });
    server.use(http.get("https://api.postcodes.io/postcodes/:postcode", () => new HttpResponse(null, { status: 500 })));
    expect(
      await listSupporters({ sort: "name", dir: "asc", page: 1, near: { text: "Leeds", miles: 50 } }),
    ).toMatchObject({
      total: 0,
      near: "failed",
    });
  });

  it("leaves out those with any of a filter's values, alone and with those it finds", async () => {
    await people();
    // At evt-2, Jane is approved and Sam declined, which isn't being at it.
    await query(
      `INSERT INTO luma_events (id, name, url, start_at, access) VALUES ('evt-2', 'evt-2', 'evt-2', '2026-11-01T18:00:00Z', 'manage')`,
    );
    await query(
      `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at) VALUES
       ('gst-j2', 'evt-2', 'usr-1', 'approved', '2026-10-20T10:00:00Z'),
       ('gst-s2', 'evt-2', 'usr-2', 'declined', '2026-10-20T10:00:00Z')`,
    );
    expect(await names({ not: { event: ["evt-2"] } })).toEqual(["Sam", "Pat", "Old"]);
    expect(await names({ not: { event: ["evt-1", "evt-2"] } })).toEqual(["Pat"]);
    expect(await names({ not: { event: ["evt-none"] } })).toEqual(["Jane", "Sam", "Pat", "Old"]);
    expect(await names({ event: ["evt-1"], not: { event: ["evt-2"] } })).toEqual(["Sam", "Old"]);
    expect(await names({ event: ["evt-2"], not: { event: ["evt-2"] } })).toEqual([]);
    expect(await names({ not: { activity: ["letter", "lumaContact"] } })).toEqual(["Sam", "Old"]);
    expect(
      await names({ not: { subscription: [{ channel: "email", topic: "site-forms", reason: "asked" }] } }),
    ).toEqual(["Jane", "Sam", "Old"]);
    // Jane's postcode places her in England; Pat has no place, so isn't in England either.
    await query(
      `INSERT INTO postcode_places (postcode, latitude, longitude, place, country)
       VALUES ('M11AE', 53.4794, -2.2353, 'Manchester', 'england')`,
    );
    expect(await names({ not: { country: ["england"] } })).toEqual(["Sam", "Pat", "Old"]);
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
    expect(sam.activity.map((a) => a.kind)).toEqual(["opted-out", "luma-contact", "luma-registered"]);
    // Whether we'd contact each address and number about each topic (lib/server/contact-permissions.ts).
    expect(sam.permissions.map((p) => [p.topic, p.send, p.reason])).toEqual([["luma-calendar", "no", "unsubscribed"]]);

    const [{ id: pat }] = await query<{ id: number }>(
      "SELECT supporter_id::int AS id FROM supporter_links WHERE form_entry_id IS NOT NULL",
    );
    const details = (await getSupporter(pat))!;
    expect(details.links[0]).toMatchObject({ source: "form", sourceId: expect.stringMatching(/^\d+$/) });
    expect(details.permissions.map((p) => [p.address, p.topic, p.send])).toEqual([
      ["pat@example.com", "site-forms", "yes"],
    ]);
    expect(details.contacts).toEqual([
      {
        source: "email-your-mp",
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
      sources: ["email-your-mp", "member"],
      member: true,
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
    expect(jane.permissions.find((p) => p.topic === "pauseai-updates")).toMatchObject({
      send: "unsure",
      reason: "asked",
    });
    expect(jane.activity).toContainEqual({
      source: "member",
      at: new Date("2024-03-23T00:00:00Z"),
      kind: "member-joined",
      title: "Volunteer",
      detail: "pauseai.uk",
      href: "https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/recJane",
      status: null,
    });
    expect(jane.links.map((l) => l.source).sort()).toEqual(["form", "member"]);

    // A member no longer read is no longer one, though what they gave stays.
    await query("UPDATE members SET removed_at = now()");
    const removed = (await getSupporter(await supporterWith("jane@example.com")))!;
    expect(removed.summary).toMatchObject({ member: false, sources: ["email-your-mp", "member"] });
    expect(removed.permissions.find((p) => p.topic === "pauseai-updates")).toMatchObject({
      send: "no",
      reason: "removed",
    });
  });
});
