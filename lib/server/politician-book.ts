import "server-only";
import type { PoliticianBook } from "@/lib/one-off";
import { query } from "./db";
import { gmailAccounts } from "./gmail-accounts";

// Every address a politician has or has had, and the domains of their own:
// what says a message is to or from one, and whose thread it is.

/** The politician book: current addresses, past ones from the audit log's edits, and their own domains. */
export async function politicianBook(): Promise<PoliticianBook> {
  const rows = await query<{ id: number; address: string }>(
    `SELECT id, address FROM (
       SELECT id::int AS id, lower(email) AS address FROM notable_people
       UNION
       SELECT (details->>'id')::int, lower(jsonb_array_elements_text(details->'changed'->'email'))
         FROM audit_log WHERE action = 'edit politician' AND details->'changed' ? 'email'
     ) every WHERE address LIKE '%@%'`,
  );
  const addresses = new Map<string, number[]>();
  for (const { id, address } of rows) {
    addresses.set(address, [...(addresses.get(address) ?? []), id]);
  }
  const owned = await query<{ domain: string; id: number }>(
    `SELECT domain, notable_person_id::int AS id FROM politician_domains`,
  );
  return { addresses, domains: new Map(owned.map(({ domain, id }) => [domain, id])) };
}

/** The connected Gmails, which with the aliases are PauseAI's accounts. */
export async function connectedAccounts(): Promise<string[]> {
  return (await gmailAccounts()).map((account) => account.email);
}
