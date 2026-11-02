import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { staffCopy } from "@/lib/content/staff-interface";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query, transaction } from "./db";
import { recordProblem } from "./email";
import { eventsSearch } from "@/lib/staff-search";
import { assignRuleOwners, eventsPage, ownerEmails, setEventDoc, setEventOwner } from "./staff-events";

type Sent = { From: string; To: string; Cc?: string; Subject: string; TextBody: string; Tag: string };

/** Records each email sent through Postmark. */
function postmark() {
  const sent: Sent[] = [];
  server.use(
    http.post("https://api.postmarkapp.com/email", async ({ request }) => {
      sent.push((await request.json()) as Sent);
      return HttpResponse.json({ ErrorCode: 0, MessageID: randomUUID() });
    }),
  );
  return sent;
}

const NOW = "2026-11-02T12:00:00.000Z";

/** One of our events, or with `view`, one another calendar runs. */
async function addEvent(
  id: string,
  startAt: string,
  { city = "London" as string | null, tags = [] as string[], access = "manage", removed = false } = {},
) {
  await query(
    `INSERT INTO luma_events (id, name, url, start_at, access, city, tags, removed_at)
     VALUES ($1, $2, $1, $3, $4, $5, $6, CASE WHEN $7 THEN now() END)`,
    [id, `Event ${id}`, startAt, access, city, tags, removed],
  );
}

async function addStaff(...emails: string[]) {
  for (const email of emails) {
    await query("INSERT INTO staff_accounts (email, added_by) VALUES ($1, 'admin@pauseai.uk')", [email]);
  }
}

/** A guest of `eventId`, approved unless said otherwise, and on its list unless `removed`. */
async function addGuest(id: string, eventId: string, status = "approved", removed = false) {
  await query("INSERT INTO luma_people (user_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
    `usr-${id}`,
    `${id}@example.com`,
  ]);
  await query(
    `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, removed_at)
     VALUES ($1, $2, $3, $4, now(), CASE WHEN $5 THEN now() END)`,
    [id, eventId, `usr-${id}`, status, removed],
  );
}

const owners = () =>
  query<{ event_id: string; owner: string; assigned_by: string }>(
    "SELECT event_id, owner, assigned_by FROM event_owners ORDER BY event_id",
  );
const audit = () => query("SELECT actor, action, details FROM audit_log ORDER BY id");

/** An ISO time `n` days from the database's now. */
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("FIXTURE_NOW", NOW);
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("staff events", () => {
  useTestDatabase();

  it("lists our events to come, soonest first, or those past, latest first, with who's going, their owners and docs", async () => {
    await addStaff("jo@pauseai.uk", "sean@pauseai.uk");
    await addEvent("evt-soon", "2026-11-10T18:00:00Z", { tags: ["London"] });
    await addEvent("evt-later", "2026-12-01T18:00:00Z", { city: null, removed: true });
    await addEvent("evt-october", "2026-10-20T18:00:00Z", { city: "Oxford", tags: ["Oxford", "Big events"] });
    await addEvent("evt-old", "2025-03-01T18:00:00Z");
    await addEvent("evt-theirs", "2026-11-12T18:00:00Z", { access: "view" });
    await addGuest("gst-1", "evt-soon");
    await addGuest("gst-2", "evt-soon");
    await addGuest("gst-3", "evt-soon", "waitlist");
    await addGuest("gst-4", "evt-soon", "approved", true);
    await query(
      "INSERT INTO event_owners (event_id, owner, assigned_by) VALUES ('evt-october', 'jo@pauseai.uk', 'sync')",
    );
    await query(
      "INSERT INTO event_docs (event_id, url, set_by) VALUES ('evt-soon', 'https://docs.google.com/document/d/soon', 'jo@pauseai.uk')",
    );

    const future = await eventsPage(eventsSearch({}).filter);
    expect(future.now).toBe(NOW);
    expect(future.staff).toEqual(["jo@pauseai.uk", "sean@pauseai.uk"]);
    // Every tag and city of our events, of either tab, for the filters.
    expect(future.tags).toEqual(["Big events", "London", "Oxford"]);
    expect(future.cities).toEqual(["London", "Oxford"]);
    expect([future.total, future.pages]).toEqual([2, 1]);
    expect(future.events).toEqual([
      {
        id: "evt-soon",
        name: "Event evt-soon",
        url: "https://luma.com/evt-soon",
        startAt: "2026-11-10T18:00:00.000Z",
        city: "London",
        tags: ["London"],
        removed: false,
        going: 2,
        owner: null,
        doc: "https://docs.google.com/document/d/soon",
      },
      expect.objectContaining({ id: "evt-later", city: null, removed: true, going: 0 }),
    ]);
    const past = await eventsPage(eventsSearch({ when: "past" }).filter);
    expect(past.events.map((event) => [event.id, event.owner])).toEqual([
      ["evt-october", "jo@pauseai.uk"],
      ["evt-old", null],
    ]);
  });

  it("finds none with no events", async () => {
    expect(await eventsPage(eventsSearch({}).filter)).toMatchObject({ events: [], total: 0, tags: [], cities: [] });
  });

  it("changes an event's owner, logs it, and emails the new owner, whoever chose them, copied to the one before", async () => {
    const sent = postmark();
    await addStaff("jo@pauseai.uk", "sean@pauseai.uk", "joseph@pauseai.uk");
    await addEvent("evt-1", "2026-11-10T18:00:00Z");
    const body = (owner: string, previous: string | null, by: string) =>
      staffCopy.events.ownerEmail.body({
        events: [{ name: "Event evt-1", when: "Tue 10 Nov 2026, 18:00", url: "https://luma.com/evt-1" }],
        owner,
        previous,
        by,
      });

    // A first owner: only them.
    expect(await setEventOwner("evt-1", "sean@pauseai.uk", "jo@pauseai.uk")).toEqual(["sean@pauseai.uk"]);
    expect(await owners()).toEqual([{ event_id: "evt-1", owner: "sean@pauseai.uk", assigned_by: "jo@pauseai.uk" }]);
    expect(sent).toEqual([
      expect.objectContaining({
        To: "sean@pauseai.uk",
        Subject: staffCopy.events.ownerEmail.subject(1, "Event evt-1", "sean@pauseai.uk"),
        TextBody: body("sean@pauseai.uk", null, "jo@pauseai.uk"),
        Tag: "staff-alert",
      }),
    ]);
    expect(sent[0].Cc).toBeUndefined();
    expect(sent[0].TextBody).toContain("jo@pauseai.uk");

    // The same owner again changes nothing.
    expect(await setEventOwner("evt-1", "sean@pauseai.uk", "jo@pauseai.uk")).toBeUndefined();
    expect(sent).toHaveLength(1);

    // Changed by someone else: one email, to the new owner, copied to the one before.
    expect(await setEventOwner("evt-1", "joseph@pauseai.uk", "jo@pauseai.uk")).toEqual([
      "joseph@pauseai.uk",
      "sean@pauseai.uk",
    ]);
    expect(sent[1]).toMatchObject({
      To: "joseph@pauseai.uk",
      Cc: "sean@pauseai.uk",
      TextBody: body("joseph@pauseai.uk", "sean@pauseai.uk", "jo@pauseai.uk"),
    });

    // Taken by yourself: to you, copied to the one before.
    expect(await setEventOwner("evt-1", "jo@pauseai.uk", "jo@pauseai.uk")).toEqual([
      "jo@pauseai.uk",
      "joseph@pauseai.uk",
    ]);
    expect(sent[2]).toMatchObject({
      To: "jo@pauseai.uk",
      Cc: "joseph@pauseai.uk",
      TextBody: body("jo@pauseai.uk", "joseph@pauseai.uk", "jo@pauseai.uk"),
    });

    // Given back by its owner before: to the new one, copied to them.
    expect(await setEventOwner("evt-1", "joseph@pauseai.uk", "jo@pauseai.uk")).toEqual([
      "joseph@pauseai.uk",
      "jo@pauseai.uk",
    ]);
    expect(sent[3]).toMatchObject({ To: "joseph@pauseai.uk", Cc: "jo@pauseai.uk" });
    expect(sent).toHaveLength(4);

    expect(await owners()).toEqual([{ event_id: "evt-1", owner: "joseph@pauseai.uk", assigned_by: "jo@pauseai.uk" }]);
    expect(await audit()).toEqual(
      [
        [null, "sean@pauseai.uk"],
        ["sean@pauseai.uk", "joseph@pauseai.uk"],
        ["joseph@pauseai.uk", "jo@pauseai.uk"],
        ["jo@pauseai.uk", "joseph@pauseai.uk"],
      ].map(([previous, owner]) => ({
        actor: "jo@pauseai.uk",
        action: "set event owner",
        details: { eventId: "evt-1", owner, previous },
      })),
    );
  });

  it("emails you when you take an event that had no owner", async () => {
    const sent = postmark();
    await addStaff("jo@pauseai.uk");
    await addEvent("evt-1", "2026-11-10T18:00:00Z");
    expect(await setEventOwner("evt-1", "jo@pauseai.uk", "jo@pauseai.uk")).toEqual(["jo@pauseai.uk"]);
    expect(sent).toEqual([
      expect.objectContaining({
        To: "jo@pauseai.uk",
        Subject: staffCopy.events.ownerEmail.subject(1, "Event evt-1", "jo@pauseai.uk"),
      }),
    ]);
    expect(sent[0].TextBody).toContain("You took it on");
  });

  it("sets, changes and clears an event's Google Doc, logging each, but only for one of ours", async () => {
    await addEvent("evt-1", "2026-11-10T18:00:00Z");
    await addEvent("evt-theirs", "2026-11-10T18:00:00Z", { access: "view" });
    const docs = () => query("SELECT event_id, url, set_by FROM event_docs");
    const first = "https://docs.google.com/document/d/first";
    const second = "https://drive.google.com/file/d/second";

    expect(await setEventDoc("evt-1", first, "jo@pauseai.uk")).toBe(true);
    expect(await setEventDoc("evt-1", first, "jo@pauseai.uk")).toBe(false);
    expect(await setEventDoc("evt-1", second, "sean@pauseai.uk")).toBe(true);
    expect(await docs()).toEqual([{ event_id: "evt-1", url: second, set_by: "sean@pauseai.uk" }]);
    expect(await setEventDoc("evt-1", null, "jo@pauseai.uk")).toBe(true);
    expect(await docs()).toEqual([]);
    expect(await setEventDoc("evt-theirs", first, "jo@pauseai.uk")).toBe(false);
    expect(await setEventDoc("evt-none", first, "jo@pauseai.uk")).toBe(false);
    expect(await audit()).toEqual([
      { actor: "jo@pauseai.uk", action: "set event doc", details: { eventId: "evt-1", url: first, previous: null } },
      {
        actor: "sean@pauseai.uk",
        action: "set event doc",
        details: { eventId: "evt-1", url: second, previous: first },
      },
      { actor: "jo@pauseai.uk", action: "set event doc", details: { eventId: "evt-1", url: null, previous: second } },
    ]);
  });

  it("says it emailed no one when the email couldn't go", async () => {
    postmark();
    await addStaff("jo@pauseai.uk", "sean@pauseai.uk");
    await addEvent("evt-1", "2026-11-10T18:00:00Z");
    await recordProblem({ address: "sean@pauseai.uk", messageId: null, kind: "hard", reason: "Gone", canReset: true });
    expect(await setEventOwner("evt-1", "sean@pauseai.uk", "jo@pauseai.uk")).toEqual([]);
  });

  it("gives no owner to an event that isn't ours or doesn't exist, or to an address with no account", async () => {
    await addStaff("jo@pauseai.uk");
    await addEvent("evt-theirs", "2026-11-10T18:00:00Z", { access: "view" });
    await addEvent("evt-ours", "2026-11-10T18:00:00Z");
    expect(await setEventOwner("evt-theirs", "jo@pauseai.uk", "jo@pauseai.uk")).toBeUndefined();
    expect(await setEventOwner("evt-none", "jo@pauseai.uk", "jo@pauseai.uk")).toBeUndefined();
    expect(await setEventOwner("evt-ours", "nobody@pauseai.uk", "jo@pauseai.uk")).toBeUndefined();
    expect(await owners()).toEqual([]);
  });

  it("gives events to come with no owner theirs by the rules, if they have an account, and emails each once", async () => {
    const sent = postmark();
    await addStaff("joseph@pauseai.uk", "sean@pauseai.uk", "jo@pauseai.uk");
    await addEvent("evt-london", days(5));
    await addEvent("evt-london-2", days(6));
    await addEvent("evt-oxford", days(7), { city: "Oxford" });
    await addEvent("evt-oxford-tag", days(8), { city: null, tags: ["Oxford"] });
    await addEvent("evt-owned", days(9));
    await addEvent("evt-past", days(-9));
    await addEvent("evt-removed", days(9), { removed: true });
    await addEvent("evt-theirs", days(9), { access: "view" });
    await query(
      "INSERT INTO event_owners (event_id, owner, assigned_by) VALUES ('evt-owned', 'jo@pauseai.uk', 'jo@pauseai.uk')",
    );

    const given = await transaction((db) => assignRuleOwners(db));
    expect(given).toEqual(
      new Map([
        ["joseph@pauseai.uk", ["evt-london", "evt-london-2"]],
        ["sean@pauseai.uk", ["evt-oxford", "evt-oxford-tag"]],
      ]),
    );
    expect(await owners()).toEqual([
      { event_id: "evt-london", owner: "joseph@pauseai.uk", assigned_by: "sync" },
      { event_id: "evt-london-2", owner: "joseph@pauseai.uk", assigned_by: "sync" },
      { event_id: "evt-owned", owner: "jo@pauseai.uk", assigned_by: "jo@pauseai.uk" },
      { event_id: "evt-oxford", owner: "sean@pauseai.uk", assigned_by: "sync" },
      { event_id: "evt-oxford-tag", owner: "sean@pauseai.uk", assigned_by: "sync" },
    ]);
    expect(await audit()).toContainEqual({
      actor: "sync",
      action: "set event owner",
      details: { eventId: "evt-oxford", owner: "sean@pauseai.uk", previous: null },
    });

    await ownerEmails(given);
    expect(sent.map((email) => [email.To, email.Subject])).toEqual([
      ["joseph@pauseai.uk", staffCopy.events.ownerEmail.subject(2, "Event evt-london", "joseph@pauseai.uk")],
      ["sean@pauseai.uk", staffCopy.events.ownerEmail.subject(2, "Event evt-oxford", "sean@pauseai.uk")],
    ]);
    expect(sent[0].TextBody).toContain("https://luma.com/evt-london-2");
  });

  it("leaves an event with no owner when its owner by the rules has no account", async () => {
    await addEvent("evt-london", days(5));
    expect(await transaction((db) => assignRuleOwners(db))).toEqual(new Map());
    expect(await owners()).toEqual([]);
  });
});
