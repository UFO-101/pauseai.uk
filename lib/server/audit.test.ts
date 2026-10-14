import { expect, it } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { logChange, recentChanges } from "./audit";

describeWithDatabase("the change log", () => {
  useTestDatabase();

  it("lists changes, newest first", async () => {
    await logChange("jo@pauseai.uk", "first", { a: 1 });
    await logChange("sync", "second", {});
    const changes = await recentChanges();
    expect(changes.map(({ actor, action, details }) => ({ actor, action, details }))).toEqual([
      { actor: "sync", action: "second", details: {} },
      { actor: "jo@pauseai.uk", action: "first", details: { a: 1 } },
    ]);
    expect(await recentChanges(1)).toHaveLength(1);
  });
});
