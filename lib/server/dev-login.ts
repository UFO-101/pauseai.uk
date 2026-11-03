import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { listStaffAccounts } from "./staff-accounts";

/** A pauseai.uk address with no account yet, to see someone's first login. */
export const NOBODY = "nobody@pauseai.uk";

/** One address the dev login offers, and what it is: its permissions, an account with none, or no account yet. */
export type DevLoginChoice = { email: string; description: string };

/**
 * The shared inboxes a person may log in as, to see the site as they do:
 * the letters inbox (LETTERS_INBOX) and the policy team's (POLICY_INBOX),
 * where they're at pauseai.uk, as only those can log in; each with what it is.
 */
function sharedInboxes(): { email: string; role: string }[] {
  const copy = staffCopy.devLogin;
  return [
    { email: process.env.LETTERS_INBOX, role: copy.lettersInbox },
    { email: process.env.POLICY_INBOX, role: copy.policyInbox },
  ].flatMap(({ email, role }) => {
    const address = email?.trim().toLowerCase() ?? "";
    return /@pauseai\.uk$/.test(address) ? [{ email: address, role }] : [];
  });
}

/**
 * The addresses the dev login offers, in a fixture build: every account,
 * the shared inboxes saying which they are, then, until each has one, the
 * shared inboxes and an address with no account yet. Undefined anywhere
 * else, where there's no dev login.
 */
export async function devLoginAccounts(): Promise<DevLoginChoice[] | undefined> {
  if (!fixturesEnabled()) return undefined;
  const copy = staffCopy.devLogin;
  const shared = sharedInboxes();
  const roleOf = (email: string) => shared.find((inbox) => inbox.email === email)?.role;
  const accounts = (await listStaffAccounts()).map((account) => {
    const description =
      account.permissions.length > 0
        ? copy.permissions(account.permissions.map((p) => staffCopy.accounts.names[p]).join(", "))
        : copy.noPermissions;
    const role = roleOf(account.email);
    return { email: account.email, description: role ? `${role} · ${description}` : description };
  });
  const missing = [
    ...shared.map(({ email, role }) => ({ email, description: `${role} · ${copy.noAccount}` })),
    { email: NOBODY, description: copy.noAccount },
  ].filter((choice) => !accounts.some((account) => account.email === choice.email));
  return [...accounts, ...missing];
}
