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
    expect(await importMembers("nightly")).toMatchObject({ members: 1, added: 0 });
    expect(await query("SELECT id FROM members")).toEqual([]);
  });

  it("keeps a failed run, rolling back the rest", async () => {
    server.use(http.get(MEMBERS, () => HttpResponse.json({ error: "NOT_AUTHORIZED" }, { status: 403 })));
    await expect(importMembers("nightly")).rejects.toThrow("status 403");
    expect(await query("SELECT status, error FROM import_runs")).toEqual([
      { status: "failed", error: expect.stringContaining("status 403") },
    ]);
  });
});
