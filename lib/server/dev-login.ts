import "server-only";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { listStaffAccounts } from "./staff-accounts";

/** A pauseai.uk address with no account, to see what someone not yet added sees. */
export const NOBODY = "nobody@pauseai.uk";

/**
 * The addresses the dev login offers, in a fixture build: every account,
 * then one with no account. Undefined anywhere else, where there's no dev
 * login.
 */
export async function devLoginAccounts(): Promise<string[] | undefined> {
  if (!fixturesEnabled()) return undefined;
  return [...(await listStaffAccounts()).map((account) => account.email), NOBODY];
}
