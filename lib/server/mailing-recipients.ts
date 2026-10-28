import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { ASK_STATUSES } from "@/lib/asks";
import { answerCondition, POLITICIAN_FIELDS, type MailingChoice } from "@/lib/mailing-fields";
import type { MailingRecipientValues } from "@/lib/mailing-doc";
import { listAsks } from "./asks";
import { mailingPoliticians, politiciansSearch, type MailingPolitician } from "./politicians";
import type { StoredFilter } from "./stored-filters";

// Who a mailing to politicians goes to: everyone its filter finds who has
// an address we can write to. Those with none, or with one that's blocked,
// are left out from the start, and the page says who.

const copy = staffCopy.mailingEditor;

/** A politician a mailing goes to, with their merge fields' values and the conditions they meet. */
export type PoliticianRecipient = MailingPolitician & MailingRecipientValues;

/** Someone a mailing's filter finds whom it can't go to. */
export type LeftOut = { id: number; name: string; reason: "no-address" | "blocked" };

export type PoliticianAudience = {
  recipients: PoliticianRecipient[];
  leftOut: LeftOut[];
  /** The merge fields, with how many recipients lack a value for each. */
  fields: MailingChoice[];
  /** Each answer a recipient has given to an ask, with how many gave it. */
  conditions: MailingChoice[];
};

/** A politician's value for each merge field: blank for one they have none for. */
function fieldValues(politician: MailingPolitician): Record<string, string> {
  return {
    salutation: politician.salutation,
    name: politician.name,
    constituency: politician.constituency ?? "",
    party: politician.party,
    house: staffCopy.houses[politician.house],
  };
}

/** Who a mailing to politicians with this filter goes to and who it leaves out, and what its letter can use. */
export async function politicianAudience(filter: StoredFilter): Promise<PoliticianAudience> {
  const [found, asks] = await Promise.all([mailingPoliticians(politiciansSearch(filter.params).filter), listAsks()]);
  const leftOut: LeftOut[] = [];
  const recipients: PoliticianRecipient[] = [];
  for (const politician of found) {
    if (!politician.email?.trim()) leftOut.push({ id: politician.id, name: politician.name, reason: "no-address" });
    else if (politician.blocked) leftOut.push({ id: politician.id, name: politician.name, reason: "blocked" });
    else recipients.push({ ...politician, values: fieldValues(politician), meets: politician.answers });
  }
  const fields = POLITICIAN_FIELDS.map((id) => ({
    id,
    label: copy.fields[id],
    lacking: recipients.filter((recipient) => !recipient.values[id].trim()).length,
  }));
  const covers = new Map<string, number>();
  for (const answer of recipients.flatMap((recipient) => recipient.meets)) {
    covers.set(answer, (covers.get(answer) ?? 0) + 1);
  }
  // In the asks' order, newest first, then each kind's answers in order.
  const conditions = asks.flatMap((ask) =>
    (ASK_STATUSES[ask.kind] as readonly string[])
      .map((status) => ({ status, id: answerCondition(ask.slug, status) }))
      .filter(({ id }) => covers.has(id))
      .map(({ status, id }) => ({
        id,
        label: copy.answered(staffCopy.statuses[status], ask.title),
        covers: covers.get(id)!,
      })),
  );
  return { recipients, leftOut, fields, conditions };
}
