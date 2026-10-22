import { afterEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { devLoginAccounts, NOBODY } from "./dev-login";
import { saveStaffAccount } from "./staff-accounts";

afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("devLoginAccounts", () => {
  useTestDatabase();

  it("lists the accounts and then an address with none in a fixture build, and is nothing anywhere else", async () => {
    await saveStaffAccount("jo@pauseai.uk", [], "admin@pauseai.uk");
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(await devLoginAccounts()).toEqual(["jo@pauseai.uk", NOBODY]);
    vi.stubEnv("DATA_FIXTURES", "");
    expect(await devLoginAccounts()).toBeUndefined();
  });
});
