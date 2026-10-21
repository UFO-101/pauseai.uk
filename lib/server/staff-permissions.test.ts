import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { admins, listStaffPermissions, permissionsOf, setStaffPermissions } from "./staff-permissions";

const log = () =>
  query<{ actor: string; action: string; details: unknown }>(
    "SELECT actor, action, details FROM audit_log ORDER BY id",
  );

describeWithDatabase("staff permissions", () => {
  useTestDatabase();

  it("gives the built-in admin everything, and everyone else nothing, before anything is granted", async () => {
    expect(await permissionsOf("admin@pauseai.uk")).toEqual(["admin", "supporters"]);
    expect(await permissionsOf("jo@pauseai.uk")).toEqual([]);
    expect(await listStaffPermissions()).toEqual([
      { email: "admin@pauseai.uk", permissions: ["admin", "supporters"], grantedBy: null, grantedAt: null },
    ]);
    expect(await admins()).toEqual(["admin@pauseai.uk"]);
  });

  it("grants, changes and revokes permissions, lowercasing the address, logging each change once", async () => {
    expect(await setStaffPermissions(" Jo@PauseAI.uk ", ["supporters", "supporters"], "admin@pauseai.uk")).toBe(true);
    expect(await permissionsOf("JO@pauseai.uk")).toEqual(["supporters"]);
    expect(await setStaffPermissions("jo@pauseai.uk", ["supporters"], "admin@pauseai.uk")).toBe(false);
    expect(await setStaffPermissions("jo@pauseai.uk", ["supporters", "admin"], "admin@pauseai.uk")).toBe(true);
    expect(await setStaffPermissions("sam@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe(true);
    const list = await listStaffPermissions();
    expect(list.map((s) => [s.email, s.permissions, s.grantedBy])).toEqual([
      ["admin@pauseai.uk", ["admin", "supporters"], null],
      ["jo@pauseai.uk", ["admin", "supporters"], "admin@pauseai.uk"],
      ["sam@pauseai.uk", ["supporters"], "jo@pauseai.uk"],
    ]);
    expect(list[1].grantedAt).not.toBeNull();
    expect(await admins()).toEqual(["admin@pauseai.uk", "jo@pauseai.uk"]);

    expect(await setStaffPermissions("jo@pauseai.uk", [], "admin@pauseai.uk")).toBe(true);
    expect(await setStaffPermissions("jo@pauseai.uk", [], "admin@pauseai.uk")).toBe(false);
    expect(await permissionsOf("jo@pauseai.uk")).toEqual([]);
    expect(await query("SELECT email FROM staff_permissions")).toEqual([{ email: "sam@pauseai.uk" }]);
    expect(await log()).toEqual([
      {
        actor: "admin@pauseai.uk",
        action: "set staff permissions",
        details: { email: "jo@pauseai.uk", from: [], to: ["supporters"] },
      },
      {
        actor: "admin@pauseai.uk",
        action: "set staff permissions",
        details: { email: "jo@pauseai.uk", from: ["supporters"], to: ["admin", "supporters"] },
      },
      {
        actor: "jo@pauseai.uk",
        action: "set staff permissions",
        details: { email: "sam@pauseai.uk", from: [], to: ["supporters"] },
      },
      {
        actor: "admin@pauseai.uk",
        action: "set staff permissions",
        details: { email: "jo@pauseai.uk", from: ["admin", "supporters"], to: [] },
      },
    ]);
  });

  it("never changes the built-in admin's", async () => {
    expect(await setStaffPermissions("admin@pauseai.uk", [], "jo@pauseai.uk")).toBe(false);
    expect(await permissionsOf("admin@pauseai.uk")).toEqual(["admin", "supporters"]);
    expect(await log()).toEqual([]);
  });
});
