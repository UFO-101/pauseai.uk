import "server-only";
import { fixturesEnabled } from "@/lib/fixtures-enabled";
import { listStaffAccounts } from "./staff-accounts";

/** The accounts the dev login offers, in a fixture build; undefined anywhere else, where there's no dev login. */
export async function devLoginAccounts(): Promise<string[] | undefined> {
  if (!fixturesEnabled()) return undefined;
  return (await listStaffAccounts()).map((account) => account.email);
}
