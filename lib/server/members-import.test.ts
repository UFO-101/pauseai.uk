import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { importMembers } from "./members-import";
import { MEMBER_FIELDS } from "./outside-services/airtable";

const MEMBERS = "https://api.airtable.com/v0/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o";

/** Airtable's members table answering with `records`, each given as its fields. */
function serve(records: Record<string, Record<string, unknown>>) {
  server.use(
    http.get(MEMBERS, () =>
      HttpResponse.json({
        records: Object.entries(records).map(([id, fields]) => ({
          id,
          createdTime: "2026-01-01T00:00:00.000Z",
          fields,
        })),
      }),
    ),
  );
}

/** A member's fields, joined on `created`, ticking "Keep me informed" unless told otherwise. */
function member(email: string, created: string, fields: Record<string, unknown> = {}) {
  return {
    Email: email,
    "Full name": "A Member",
    "Joined Datetime": created.slice(0, 10),
    "Created Datetime": created,
    "Last Modified": created,
    "Email subscription": true,
    "GDPR chapter share permission": true,
    ...fields,
  };
}

const optOuts = () =>
  query<{ address: string; source_ref: string; unsubscribed_at: Date; resubscribed_at: Date | null }>(
    "SELECT address, source_ref, unsubscribed_at, resubscribed_at FROM opt_outs ORDER BY id",
  );

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "t"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("importMembers", () => {
  useTestDatabase();

  it("copies every field it reads into a column, and a second run changes nothing", async () => {
    const fields = {
      ...member("Jane@Example.com", "2026-09-12T10:00:00.000Z"),
      Phone: "+447700900123",
      City: "Manchester",
      "Zip code": "M1 1AE",
      "Email subscription (old)": "Yes",
      "Source page": "pauseai.uk",
      Intent: "Volunteer",
    };
    expect(Object.keys(fields).sort()).toEqual([...MEMBER_FIELDS].sort());
    serve({ recJane: fields });

    expect(await importMembers("jo@pauseai.uk")).toEqual({
      members: 1,
      added: 1,
      changed: 0,
      removed: 0,
      optedOut: 0,
      resubscribed: 0,
      supportersAdded: 1,
      linked: 1,
    });
    // Every column but the import's own bookkeeping holds what Airtable gave.
    const [row] = await query<Record<string, unknown>>("SELECT * FROM members");
    const { removed_at, first_seen_at, changed_at, ...copied } = row;
    expect(removed_at).toBeNull();
    expect(first_seen_at).toBeInstanceOf(Date);
    expect(changed_at).toBeInstanceOf(Date);
    expect(copied).toEqual({
      id: "recJane",
      email: "jane@example.com",
      name: "A Member",
      phone: "+447700900123",
      city: "Manchester",
      postcode: "M1 1AE",
      joined_at: new Date("2026-09-12T10:00:00.000Z"),
      created_at: new Date("2026-09-12T10:00:00.000Z"),
      keep_informed: true,
      share_permission: true,
      source_page: "pauseai.uk",
      intent: "Volunteer",
      source_modified_at: new Date("2026-09-12T10:00:00.000Z"),
    });

    expect((await importMembers("nightly")).added).toBe(0);
    const runs = await query<{ status: string; started_by: string }>(
      "SELECT status, started_by FROM import_runs WHERE job = 'import-members' ORDER BY id",
    );
    expect(runs).toEqual([
      { status: "ok", started_by: "jo@pauseai.uk" },
      { status: "unchanged", started_by: "nightly" },
    ]);
  });

  it("changes a member who changed, marks one no longer read removed, and brings them back", async () => {
    serve({
      recA: member("a@example.com", "2026-09-01T00:00:00Z"),
      recB: member("b@example.com", "2026-09-01T00:00:00Z"),
    });
    await importMembers("nightly");
    serve({ recA: member("a@example.com", "2026-09-01T00:00:00Z", { City: "Leeds" }) });
    expect(await importMembers("nightly")).toMatchObject({ added: 0, changed: 1, removed: 1 });
    expect(await query("SELECT id, city, removed_at IS NOT NULL AS removed FROM members ORDER BY id")).toEqual([
      { id: "recA", city: "Leeds", removed: false },
      { id: "recB", city: null, removed: true },
    ]);
    // Removed already: not counted again.
    expect((await importMembers("nightly")).removed).toBe(0);
    serve({
      recA: member("a@example.com", "2026-09-01T00:00:00Z", { City: "Leeds" }),
      recB: member("b@example.com", "2026-09-01T00:00:00Z"),
    });
    expect(await importMembers("nightly")).toMatchObject({ changed: 1, removed: 0 });
    expect(await query("SELECT id FROM members WHERE removed_at IS NULL ORDER BY id")).toEqual([
      { id: "recA" },
      { id: "recB" },
    ]);
  });

  it("never copies an erased member back", async () => {
    await query("INSERT INTO members_erased (id) VALUES ('recGone')");
    serve({ recGone: member("gone@example.com", "2026-09-01T00:00:00Z", { "Email subscription": false }) });
    expect(await importMembers("nightly")).toMatchObject({ members: 1, added: 0, optedOut: 0 });
    expect(await query("SELECT id FROM members")).toEqual([]);
    expect(await optOuts()).toEqual([]);
  });

  it("opts out a member who left Keep me informed unticked when it was a choice, once", async () => {
    serve({
      // Unticked from 30 June 2026: an opt-out, dated when they joined.
      recFree: member("free@example.com", "2026-07-02T08:00:00.000Z", { "Email subscription": false }),
      // Ticked, but No in the older field.
      recOld: member("old@example.com", "2026-07-03T08:00:00.000Z", { "Email subscription (old)": "No" }),
      // Unticked before then, when the form required it or had no box: nothing.
      recBefore: member("before@example.com", "2026-06-29T23:00:00.000Z", { "Email subscription": false }),
      recTicked: member("ticked@example.com", "2026-07-02T08:00:00.000Z"),
    });
    expect((await importMembers("nightly")).optedOut).toBe(2);
    expect(await optOuts()).toEqual([
      {
        address: "free@example.com",
        source_ref: "recFree",
        unsubscribed_at: new Date("2026-07-02T08:00:00.000Z"),
        resubscribed_at: null,
      },
      {
        address: "old@example.com",
        source_ref: "recOld",
        unsubscribed_at: new Date("2026-07-03T08:00:00.000Z"),
        resubscribed_at: null,
      },
    ]);
    expect((await importMembers("nightly")).optedOut).toBe(0);
    const [{ list, source }] = await query<{ list: string; source: string }>(
      "SELECT list, source FROM opt_outs LIMIT 1",
    );
    expect({ list, source }).toEqual({ list: "pauseai-updates", source: "airtable-import" });
  });

  it("records one opt-out for an address two unticked records share, and none where one is in force", async () => {
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at)
       VALUES ('held@example.com', 'pauseai-updates', 'airtable-import', 'recEarlier', '2026-07-01T00:00:00Z')`,
    );
    serve({
      recTwin1: member("twin@example.com", "2026-08-02T00:00:00.000Z", { "Email subscription": false }),
      recTwin2: member("twin@example.com", "2026-08-01T00:00:00.000Z", { "Email subscription": false }),
      recHeld: member("held@example.com", "2026-08-01T00:00:00.000Z", { "Email subscription": false }),
    });
    expect((await importMembers("nightly")).optedOut).toBe(1);
    expect((await optOuts()).map((o) => o.source_ref)).toEqual(["recEarlier", "recTwin2"]);
  });

  it("leaves a removed member's opt-out alone, and records none for them", async () => {
    serve({ recA: member("a@example.com", "2026-08-01T00:00:00.000Z", { "Email subscription": false }) });
    await importMembers("nightly");
    serve({});
    await importMembers("nightly");
    await query("DELETE FROM opt_outs");
    expect((await importMembers("nightly")).optedOut).toBe(0);
  });

  it("lifts its own opt-out when the address ticks the box freely, on a re-join or on the same record", async () => {
    await query(
      `INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at) VALUES
         ('rejoin@example.com', 'pauseai-updates', 'airtable-import', 'recOld', '2026-07-10T00:00:00Z'),
         ('same@example.com', 'pauseai-updates', 'airtable-import', 'recSame', '2026-07-10T00:00:00Z'),
         ('luma@example.com', 'luma-calendar', 'luma-webhook', 'w1', '2026-07-10T00:00:00Z'),
         ('earlier@example.com', 'pauseai-updates', 'airtable-import', 'recLater', '2026-09-10T00:00:00Z'),
         ('required@example.com', 'pauseai-updates', 'airtable-import', 'recX', '2026-07-10T00:00:00Z')`,
    );
    serve({
      // A new record, made after the opt-out: lifted when it was made.
      recNew: member("rejoin@example.com", "2026-10-11T08:00:00.000Z", { "Last Modified": "2026-10-12T00:00:00.000Z" }),
      // The opt-out's own record, ticked since: lifted when it changed.
      recSame: member("same@example.com", "2026-07-10T00:00:00.000Z", { "Last Modified": "2026-10-01T00:00:00.000Z" }),
      // Another source's opt-out stands.
      recLuma: member("luma@example.com", "2026-10-11T08:00:00.000Z"),
      // A ticked record older than the opt-out doesn't lift it.
      recOlder: member("earlier@example.com", "2026-08-01T00:00:00.000Z", {
        "Last Modified": "2026-10-01T00:00:00.000Z",
      }),
      // Nor does a tick from when the box was required.
      recRequired: member("required@example.com", "2026-03-01T00:00:00.000Z", {
        "Last Modified": "2026-10-01T00:00:00.000Z",
      }),
    });
    expect((await importMembers("nightly")).resubscribed).toBe(2);
    expect(
      await query("SELECT address, resubscribed_at FROM opt_outs WHERE resubscribed_at IS NOT NULL ORDER BY address"),
    ).toEqual([
      { address: "rejoin@example.com", resubscribed_at: new Date("2026-10-11T08:00:00.000Z") },
      { address: "same@example.com", resubscribed_at: new Date("2026-10-01T00:00:00.000Z") },
    ]);
    expect((await importMembers("nightly")).resubscribed).toBe(0);
  });

  it("opts out a re-join that leaves the box unticked after an earlier opt-out was lifted", async () => {
    const first = member("back@example.com", "2026-08-01T00:00:00.000Z", { "Email subscription": false });
    const ticked = member("back@example.com", "2026-09-01T00:00:00.000Z");
    serve({ recFirst: first });
    await importMembers("nightly");
    serve({ recFirst: first, recTicked: ticked });
    expect((await importMembers("nightly")).resubscribed).toBe(1);
    serve({
      recFirst: first,
      recTicked: ticked,
      recAgain: member("back@example.com", "2026-10-01T00:00:00.000Z", { "Email subscription": false }),
    });
    expect((await importMembers("nightly")).optedOut).toBe(1);
    expect(await optOuts()).toEqual([
      {
        address: "back@example.com",
        source_ref: "recFirst",
        unsubscribed_at: new Date("2026-08-01T00:00:00.000Z"),
        resubscribed_at: new Date("2026-09-01T00:00:00.000Z"),
      },
      {
        address: "back@example.com",
        source_ref: "recAgain",
        unsubscribed_at: new Date("2026-10-01T00:00:00.000Z"),
        resubscribed_at: null,
      },
    ]);
  });

  it("records no opt-out for an unticked record when a later one ticked the box", async () => {
    serve({
      recEarly: member("later@example.com", "2026-08-01T00:00:00.000Z", { "Email subscription": false }),
      recLate: member("later@example.com", "2026-09-01T00:00:00.000Z"),
    });
    expect((await importMembers("nightly")).optedOut).toBe(0);
  });

  it("keeps a failed run, rolling back the rest", async () => {
    server.use(http.get(MEMBERS, () => HttpResponse.json({ error: "NOT_AUTHORIZED" }, { status: 403 })));
    await expect(importMembers("nightly")).rejects.toThrow("status 403");
    expect(await query("SELECT status, error FROM import_runs")).toEqual([
      { status: "failed", error: expect.stringContaining("status 403") },
    ]);
  });
});
