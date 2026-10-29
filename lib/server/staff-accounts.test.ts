import { expect, it } from "vitest";
import { query } from "@/lib/server/db";
import { createSession, sessionEmail } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import {
  accountOf,
  admins,
  endStaffSessions,
  listStaffAccounts,
  removeStaffAccount,
  saveStaffAccount,
} from "./staff-accounts";

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
    expect(await saveStaffAccount("samuel.whitlock@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("changed");
    const list = await listStaffAccounts();
    expect(list.map((a) => [a.email, a.permissions, a.addedBy])).toEqual([
      ["jo@pauseai.uk", ["admin", "supporters"], "admin@pauseai.uk"],
      ["samuel.whitlock@pauseai.uk", ["supporters"], "jo@pauseai.uk"],
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
      {
        actor: "jo@pauseai.uk",
        action: "add staff account",
        details: { email: "samuel.whitlock@pauseai.uk", to: ["supporters"] },
      },
    ]);
  });

  it("lists when each last logged in and was seen, never until it has, and its sessions not yet expired", async () => {
    await saveStaffAccount("samuel.whitlock@pauseai.uk", [], "admin@pauseai.uk");
    const jo = await createSession("jo@pauseai.uk");
    await createSession("Jo@pauseai.uk", true);
    await createSession("jo@pauseai.uk");
    await query(
      "UPDATE staff_sessions SET expires_at = now() - interval '1 minute' WHERE NOT remember AND token_hash <> encode(sha256($1::bytea), 'hex')",
      [jo],
    );
    await query(
      "UPDATE staff_accounts SET last_seen_at = now() - interval '1 hour', last_login_at = now() - interval '2 hours' WHERE email = 'jo@pauseai.uk'",
    );
    expect(await sessionEmail(jo)).toBe("jo@pauseai.uk");
    const [joRow, samRow] = await listStaffAccounts();
    expect(joRow).toMatchObject({ email: "jo@pauseai.uk", addedBy: "login", sessions: 2 });
    // Seen just now, through the session; logged in two hours ago.
    expect(Date.now() - new Date(joRow.lastSeenAt!).getTime()).toBeLessThan(60_000);
    expect(new Date(joRow.lastLoginAt!).getTime()).toBeLessThan(new Date(joRow.lastSeenAt!).getTime());
    expect(samRow).toMatchObject({
      email: "samuel.whitlock@pauseai.uk",
      lastLoginAt: null,
      lastSeenAt: null,
      sessions: 0,
    });
  });

  it("ends every session of an account, logging it, and logs nothing when there were none", async () => {
    const jo = await createSession("jo@pauseai.uk");
    await createSession("jo@pauseai.uk");
    const sam = await createSession("samuel.whitlock@pauseai.uk");
    expect(await endStaffSessions("Jo@pauseai.uk", "admin@pauseai.uk")).toBe(2);
    expect(await endStaffSessions("jo@pauseai.uk", "admin@pauseai.uk")).toBe(0);
    expect(await sessionEmail(jo)).toBeUndefined();
    expect(await sessionEmail(sam)).toBe("samuel.whitlock@pauseai.uk");
    expect((await log()).filter((entry) => entry.action === "end staff sessions")).toEqual([
      { actor: "admin@pauseai.uk", action: "end staff sessions", details: { email: "jo@pauseai.uk", sessions: 2 } },
    ]);
  });

  it("refuses an address not at pauseai.uk, and so does the table", async () => {
    expect(await saveStaffAccount("jo@example.com", [], "admin@pauseai.uk")).toBe("not-pauseai");
    expect(await saveStaffAccount("jo@sub.pauseai.uk", [], "admin@pauseai.uk")).toBe("not-pauseai");
    await expect(query("INSERT INTO staff_accounts (email, added_by) VALUES ('jo@example.com', 'x')")).rejects.toThrow(
      /staff_accounts_email_pauseai/,
    );
    expect(await listStaffAccounts()).toEqual([]);
  });

  it("removes an account with its sessions and links, and does nothing for one that isn't there", async () => {
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "x");
    await saveStaffAccount("samuel.whitlock@pauseai.uk", ["supporters"], "x");
    const token = await createSession("Samuel.Whitlock@pauseai.uk");
    await query(
      "INSERT INTO staff_login_links (token_hash, email, expires_at) VALUES ('h', 'samuel.whitlock@pauseai.uk', now() + interval '1 hour')",
    );
    expect(await removeStaffAccount("Samuel.Whitlock@pauseai.uk", "jo@pauseai.uk")).toBe("changed");
    expect(await removeStaffAccount("samuel.whitlock@pauseai.uk", "jo@pauseai.uk")).toBe("unchanged");
    expect(await accountOf("samuel.whitlock@pauseai.uk")).toBeUndefined();
    expect(await sessionEmail(token)).toBeUndefined();
    expect(await query("SELECT 1 FROM staff_login_links")).toEqual([]);
    expect((await log()).at(-1)).toEqual({
      actor: "jo@pauseai.uk",
      action: "remove staff account",
      details: { email: "samuel.whitlock@pauseai.uk", permissions: ["supporters"] },
    });
  });

  it("never lets the last admin go, by removal or by losing admin, until there's another", async () => {
    await saveStaffAccount("jo@pauseai.uk", ["admin"], "x");
    expect(await removeStaffAccount("jo@pauseai.uk", "jo@pauseai.uk")).toBe("last-admin");
    expect(await saveStaffAccount("jo@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("last-admin");
    expect(await accountOf("jo@pauseai.uk")).toEqual({ permissions: ["admin"] });
    await saveStaffAccount("samuel.whitlock@pauseai.uk", ["admin"], "jo@pauseai.uk");
    expect(await saveStaffAccount("jo@pauseai.uk", ["supporters"], "jo@pauseai.uk")).toBe("changed");
    expect(await removeStaffAccount("samuel.whitlock@pauseai.uk", "jo@pauseai.uk")).toBe("last-admin");
    expect(await admins()).toEqual(["samuel.whitlock@pauseai.uk"]);
  });
});
