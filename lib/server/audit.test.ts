import { expect, it } from "vitest";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { AUDIT_PAGE_SIZE, logChange, recentChanges } from "./audit";
import { query } from "./db";

describeWithDatabase("the change log", () => {
  useTestDatabase();

  it("lists changes, newest first, a page at a time", async () => {
    await logChange("jo@pauseai.uk", "first", { a: 1 });
    await logChange("sync", "second", {});
    const { changes, pages } = await recentChanges();
    expect(changes.map(({ actor, action, details }) => ({ actor, action, details }))).toEqual([
      { actor: "sync", action: "second", details: {} },
      { actor: "jo@pauseai.uk", action: "first", details: { a: 1 } },
    ]);
    expect(pages).toBe(1);
    await query(
      `INSERT INTO audit_log (actor, action, details) SELECT 'sync', 'filler', '{}' FROM generate_series(1, $1)`,
      [AUDIT_PAGE_SIZE],
    );
    expect((await recentChanges()).changes).toHaveLength(AUDIT_PAGE_SIZE);
    const last = await recentChanges(2);
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
    await logChange("jo@pauseai.uk", "erase supporter", { id: 1 });
    const about = (await recentChanges()).changes.map(({ action, politician, supporter }) => [
      action,
      politician,
      supporter,
    ]);
    expect(about).toEqual([
      ["erase supporter", null, null],
      ["view supporter", null, { id: 1, name: null }],
      ["remove politician", null, null],
      ["edit politician", { id: polly, name: "Polly Placeholder" }, null],
      ["set status", { id: polly, name: "Polly Placeholder" }, null],
    ]);
  });
});
