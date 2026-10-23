import { afterEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { staffCopy } from "@/lib/content/staff-interface";
import { devLoginAccounts, NOBODY } from "./dev-login";
import { saveStaffAccount } from "./staff-accounts";

afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("devLoginAccounts", () => {
  useTestDatabase();

  it("lists each account with what it may do, then an address with none yet, in a fixture build; nothing anywhere else", async () => {
    await saveStaffAccount("jo@pauseai.uk", ["admin", "supporters"], "admin@pauseai.uk");
    await saveStaffAccount("sam@pauseai.uk", [], "admin@pauseai.uk");
    vi.stubEnv("DATA_FIXTURES", "1");
    const copy = staffCopy.devLogin;
    expect(await devLoginAccounts()).toEqual([
      {
        email: "jo@pauseai.uk",
        description: copy.permissions(`${staffCopy.accounts.names.admin}, ${staffCopy.accounts.names.supporters}`),
      },
      { email: "sam@pauseai.uk", description: copy.noPermissions },
      { email: NOBODY, description: copy.noAccount },
    ]);
    // Once logged in, it's an account like the others.
    await saveStaffAccount(NOBODY, [], "login");
    expect((await devLoginAccounts())!.filter((choice) => choice.email === NOBODY)).toEqual([
      { email: NOBODY, description: copy.noPermissions },
    ]);
    vi.stubEnv("DATA_FIXTURES", "");
    expect(await devLoginAccounts()).toBeUndefined();
  });
});
