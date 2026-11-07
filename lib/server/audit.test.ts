import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { AUDIT_PAGE_SIZE, changeChoices, logChange, recentChanges, type ChangesFilter } from "./audit";
import { query } from "./db";

describeWithDatabase("the change log", () => {
  useTestDatabase();

  it("lists changes, newest first, a page at a time", async () => {
    await logChange("jo@pauseai.uk", "first", { a: 1 });
    await logChange("sync", "second", {});
    const { changes, pages } = await recentChanges(true);
    expect(changes.map(({ actor, action, details }) => ({ actor, action, details }))).toEqual([
      { actor: "sync", action: "second", details: {} },
      { actor: "jo@pauseai.uk", action: "first", details: { a: 1 } },
    ]);
    expect(pages).toBe(1);
    await query(
      `INSERT INTO audit_log (actor, action, details) SELECT 'sync', 'filler', '{}' FROM generate_series(1, $1)`,
      [AUDIT_PAGE_SIZE],
    );
    expect((await recentChanges(true)).changes).toHaveLength(AUDIT_PAGE_SIZE);
    const last = await recentChanges(true, { page: 2 });
    expect(last.pages).toBe(2);
    expect(last.changes.map((c) => c.action)).toEqual(["second", "first"]);
  });

  it("names the politician or supporter an entry is about, while they're here", async () => {
    const polly = await addTestPolitician();
    await query("INSERT INTO supporters DEFAULT VALUES");
    await logChange("jo@pauseai.uk", "set status", { politicianId: polly });
    await logChange("sync", "edit politician", { id: polly, name: "Polly Placeholder" });
    await logChange("sync", "remove politician", { id: 999 });
    await logChange("jo@pauseai.uk", "view supporter", { id: 1 });
    await logChange("jo@pauseai.uk", "add note", { noteId: 1, supporterId: 1 });
    await logChange("jo@pauseai.uk", "erase supporter", { id: 1 });
    const about = (await recentChanges(true)).changes.map(({ action, politician, supporter }) => [
      action,
      politician,
      supporter,
    ]);
    expect(about).toEqual([
      ["erase supporter", null, null],
      ["add note", null, { id: 1, name: null }],
      ["view supporter", null, { id: 1, name: null }],
      ["remove politician", null, null],
      ["edit politician", { id: polly, name: "Polly Placeholder" }, null],
      ["set status", { id: polly, name: "Polly Placeholder" }, null],
    ]);
  });

  it("leaves out what's about a supporter for staff without the permission", async () => {
    const polly = await addTestPolitician();
    const [{ email }] = await query<{ email: string }>(
      "SELECT lower(email) AS email FROM notable_people WHERE id = $1",
      [polly],
    );
    await logChange("jo@pauseai.uk", "add note", { noteId: 1, supporterId: 1 });
    await logChange("jo@pauseai.uk", "add note", { noteId: 2, politicianId: polly });
    await logChange("jo@pauseai.uk", "view supporter", { id: 1 });
    await logChange("jo@pauseai.uk", "erase supporter", { id: 1 });
    await logChange("jo@pauseai.uk", "download supporters", { filters: ["jane@example.com"] });
    await logChange("postmark", "block address", { address: "jane@example.com" });
    await logChange("postmark", "block address", { address: email });
    await logChange("jo@pauseai.uk", "unblock address", { address: "jane@example.com", note: "Checked" });
    await query("DELETE FROM audit_log WHERE action = 'add politician'");
    const limited = await recentChanges(false);
    expect(limited.total).toBe(2);
    expect(limited.changes.map(({ action, details }) => [action, details])).toEqual([
      ["block address", { address: email }],
      ["add note", { noteId: 2, politicianId: polly }],
    ]);
    expect((await recentChanges(true)).total).toBe(8);
    expect(await changeChoices(false)).toEqual({
      actors: expect.arrayContaining(["jo@pauseai.uk", "postmark"]),
      actions: ["add note", "block address"],
    });
  });

  it("finds by who, what and how recent, any of those chosen and none of those left out", async () => {
    await query(
      `INSERT INTO audit_log (actor, action, details, at) VALUES
         ('jo@pauseai.uk', 'add note', '{"noteId": 1}', now() - interval '2 days'),
         ('jo@pauseai.uk', 'edit event', '{"owner": "sam@pauseai.uk"}', now() - interval '3 days'),
         ('sam@pauseai.uk', 'add note', '{"noteId": 2}', now() - interval '4 days'),
         ('sync', 'sync run', '{}', now() - interval '40 days')`,
    );
    const found = async (filter: ChangesFilter) =>
      (await recentChanges(true, filter)).changes.map((c) => `${c.actor.split("@")[0]} ${c.action}`);
    expect(await found({ actor: ["jo@pauseai.uk", "sync"] })).toEqual([
      "jo add note",
      "jo edit event",
      "sync sync run",
    ]);
    expect(await found({ action: ["add note"] })).toEqual(["jo add note", "sam add note"]);
    expect(await found({ not: { actor: ["jo@pauseai.uk"] } })).toEqual(["sam add note", "sync sync run"]);
    expect(await found({ not: { action: ["add note"] } })).toEqual(["jo edit event", "sync sync run"]);
    expect(await found({ days: 30 })).toEqual(["jo add note", "jo edit event", "sam add note"]);
    const { total } = await recentChanges(true, { actor: ["jo@pauseai.uk"], action: ["add note"] });
    expect(total).toBe(1);
    // In the order chosen, the newest first among those the same.
    expect(await found({ sort: { key: "actor", dir: "desc" } })).toEqual([
      "sync sync run",
      "sam add note",
      "jo add note",
      "jo edit event",
    ]);
    expect(await found({ sort: { key: "action", dir: "asc" } })).toEqual([
      "jo add note",
      "sam add note",
      "jo edit event",
      "sync sync run",
    ]);
    expect(await found({ sort: { key: "day", dir: "asc" } })).toEqual([
      "sync sync run",
      "sam add note",
      "jo edit event",
      "jo add note",
    ]);
  });

  it("searches who, what, the details as logged and the name of whom it's about, ignoring case", async () => {
    const polly = await addTestPolitician();
    const [{ id: jane }] = await query<{ id: number }>("INSERT INTO supporters DEFAULT VALUES RETURNING id::int AS id");
    const [entry] = await query<{ id: number }>(
      `INSERT INTO form_entries (form, name, email, contact_consent)
       VALUES ('march-2026-11', 'Jane Smith', 'jane.smith@example.com', true) RETURNING id::int AS id`,
    );
    await query(
      "INSERT INTO supporter_links (supporter_id, form_entry_id, matched_by, matched_value) VALUES ($1, $2, 'email', 'jane.smith@example.com')",
      [jane, entry.id],
    );
    await logChange("jo@pauseai.uk", "edit event", { owner: "morag@pauseai.uk" });
    await logChange("sam@pauseai.uk", "add note", { noteId: 1, politicianId: polly });
    await logChange("sam@pauseai.uk", "view supporter", { id: jane });
    const found = async (search: string) => (await recentChanges(true, { search })).changes.map((c) => c.action);
    expect(await found("MORAG")).toEqual(["edit event"]);
    expect(await found("sam@")).toEqual(["view supporter", "add note"]);
    expect(await found("edit ev")).toEqual(["edit event"]);
    expect(await found("Polly")).toEqual(["add note"]);
    expect(await found("jane smith")).toEqual(["view supporter"]);
    expect(await found("nobody at all")).toEqual([]);
  });
});
