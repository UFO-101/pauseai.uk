import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { listStaffAccounts } from "./staff-accounts";

/** A pauseai.uk address with no account yet, to see someone's first login. */
export const NOBODY = "nobody@pauseai.uk";

/** One address the dev login offers, and what it is: its permissions, an account with none, or no account yet. */
export type DevLoginChoice = { email: string; description: string };

/**
 * The addresses the dev login offers, in a fixture build: every account,
 * then, until it has one, an address with no account yet. Undefined
 * anywhere else, where there's no dev login.
 */
export async function devLoginAccounts(): Promise<DevLoginChoice[] | undefined> {
  if (!fixturesEnabled()) return undefined;
  const copy = staffCopy.devLogin;
  const accounts = (await listStaffAccounts()).map((account) => ({
    email: account.email,
    description:
      account.permissions.length > 0
        ? copy.permissions(account.permissions.map((p) => staffCopy.accounts.names[p]).join(", "))
        : copy.noPermissions,
  }));
  const first = accounts.some((account) => account.email === NOBODY)
    ? []
    : [{ email: NOBODY, description: copy.noAccount }];
  return [...accounts, ...first];
}
