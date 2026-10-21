import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { createSession, sessionEmail } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { accountOf, admins, listStaffAccounts, removeStaffAccount, saveStaffAccount } from "./staff-accounts";

const log = () =>
  query<{ actor: string; action: string; details: unknown }>(
    "SELECT actor, action, details FROM audit_log ORDER BY id",
  );

describeWithDatabase("staff accounts", () => {
  useTestDatabase();

  it("has nobody before anyone is added (the migration's admin is emptied with the rest in tests)", async () => {
    expect(await accountOf("jo@pauseai.uk")).toBeUndefined();
    expect(await listStaffAccounts()).toEqual([]);
    expect(await admins()).toEqual([]);
  });

  it("adds an account, with or without permissions, changes them, lowercases the address, and logs each change once", async () => {
    expect(await saveStaffAccount(" Jo@PauseAI.uk ", [], "admin@pauseai.uk")).toBe("changed");
    expect(await accountOf("JO@pauseai.uk")).toEqual({ permissions: [] });
    expect(await saveStaffAccount("jo@pauseai.uk", [], "admin@pauseai.uk")).toBe("unchanged");
    expect(await saveStaffAccount("jo@pauseai.uk", ["supporters", "supporters", "admin"], "admin@pauseai.uk")).toBe(
      "changed",
    );
    expect(await saveStaffAccount("sam@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("changed");
    const list = await listStaffAccounts();
    expect(list.map((a) => [a.email, a.permissions, a.addedBy])).toEqual([
      ["jo@pauseai.uk", ["admin", "supporters"], "admin@pauseai.uk"],
      ["sam@pauseai.uk", ["supporters"], "jo@pauseai.uk"],
    ]);
    expect(list[0].addedAt).toBeInstanceOf(Date);
    expect(await admins()).toEqual(["jo@pauseai.uk"]);
    expect(await log()).toEqual([
      { actor: "admin@pauseai.uk", action: "add staff account", details: { email: "jo@pauseai.uk", to: [] } },
      {
        actor: "admin@pauseai.uk",
        action: "set staff permissions",
        details: { email: "jo@pauseai.uk", from: [], to: ["admin", "supporters"] },
      },
      { actor: "jo@pauseai.uk", action: "add staff account", details: { email: "sam@pauseai.uk", to: ["supporters"] } },
    ]);
  });

  it("removes an account with its sessions and links, and does nothing for one that isn't there", async () => {
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "x");
    await saveStaffAccount("sam@pauseai.uk", ["supporters"], "x");
    const token = await createSession("Sam@pauseai.uk");
    await query(
      "INSERT INTO staff_login_links (token_hash, email, expires_at) VALUES ('h', 'sam@pauseai.uk', now() + interval '1 hour')",
    );
    expect(await removeStaffAccount("Sam@pauseai.uk", "jo@pauseai.uk")).toBe("changed");
    expect(await removeStaffAccount("sam@pauseai.uk", "jo@pauseai.uk")).toBe("unchanged");
    expect(await accountOf("sam@pauseai.uk")).toBeUndefined();
    expect(await sessionEmail(token)).toBeUndefined();
    expect(await query("SELECT 1 FROM staff_login_links")).toEqual([]);
    expect((await log()).at(-1)).toEqual({
      actor: "jo@pauseai.uk",
      action: "remove staff account",
      details: { email: "sam@pauseai.uk", permissions: ["supporters"] },
    });
  });

  it("never lets the last admin go, by removal or by losing admin, until there's another", async () => {
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "x");
    expect(await removeStaffAccount("jo@pauseai.uk", "jo@pauseai.uk")).toBe("last-admin");
    expect(await saveStaffAccount("jo@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("last-admin");
    expect(await accountOf("jo@pauseai.uk")).toEqual({ permissions: ["admin"] });
    await saveStaffAccount("sam@pauseai.uk", ["admin"], "jo@pauseai.uk");
    expect(await saveStaffAccount("jo@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("changed");
    expect(await removeStaffAccount("sam@pauseai.uk", "jo@pauseai.uk")).toBe("last-admin");
    expect(await admins()).toEqual(["sam@pauseai.uk"]);
  });
});
