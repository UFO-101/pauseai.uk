import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { AUDIT_PAGE_SIZE, logChange, recentChanges } from "./audit";
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
    const last = await recentChanges(true, 2);
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
    await logChange("jo@pauseai.uk", "create message", { id: 1, channel: "email", topic: "luma-calendar" });
    await logChange("jo@pauseai.uk", "schedule message", { id: 1, recipients: 3 });
    await logChange("jo@pauseai.uk", "stop message", { id: 1, was: "scheduled" });
    await logChange("jo@pauseai.uk", "reply to message", { id: 1 });
    await query("DELETE FROM audit_log WHERE action = 'add politician'");
    const limited = await recentChanges(false);
    expect(limited.total).toBe(2);
    expect(limited.changes.map(({ action, details }) => [action, details])).toEqual([
      ["block address", { address: email }],
      ["add note", { noteId: 2, politicianId: polly }],
    ]);
    expect((await recentChanges(true)).total).toBe(12);
  });
});
