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
    await saveStaffAccount("samuel.whitlock@pauseai.uk", [], "admin@pauseai.uk");
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("LETTERS_INBOX", "");
    const copy = staffCopy.devLogin;
    expect(await devLoginAccounts()).toEqual([
      {
        email: "jo@pauseai.uk",
        description: copy.permissions(`${staffCopy.accounts.names.admin}, ${staffCopy.accounts.names.supporters}`),
      },
      { email: "samuel.whitlock@pauseai.uk", description: copy.noPermissions },
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

  it("offers the shared inboxes at pauseai.uk, saying which they are, with an account or not yet", async () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    vi.stubEnv("LETTERS_INBOX", " Letters@pauseai.uk ");
    vi.stubEnv("POLICY_INBOX", "policy@pauseai.uk");
    await saveStaffAccount("letters@pauseai.uk", ["supporters"], "admin@pauseai.uk");
    const copy = staffCopy.devLogin;
    expect(await devLoginAccounts()).toEqual([
      {
        email: "letters@pauseai.uk",
        description: `${copy.lettersInbox} · ${copy.permissions(staffCopy.accounts.names.supporters)}`,
      },
      { email: "policy@pauseai.uk", description: `${copy.policyInbox} · ${copy.noAccount}` },
      { email: NOBODY, description: copy.noAccount },
    ]);
    // One that isn't at pauseai.uk can't log in, so isn't offered.
    vi.stubEnv("POLICY_INBOX", "policy@example.org");
    vi.stubEnv("LETTERS_INBOX", "");
    expect((await devLoginAccounts())!.map((choice) => choice.email)).toEqual(["letters@pauseai.uk", NOBODY]);
  });
});
