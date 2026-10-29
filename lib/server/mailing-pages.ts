import "server-only";
import { RECIPIENT_TABS, getMailing, type Mailing, type RecipientTab } from "./mailings";
import type { MailingChoice } from "@/lib/mailing-fields";
import type { MailingRecipientValues } from "@/lib/mailing-doc";
import { listAsks, type Ask } from "./asks";
import { gmailAccounts, type GmailAccount } from "./gmail-accounts";
import { mailingChannel } from "./mailing-channels";
import { getWrittenMailing, openWrittenMailing, type WrittenMailing } from "./mailing-drafts";
import { politicianAudience, type LeftOut } from "./mailing-recipients";
import { listParties } from "./politicians";
import { firstOf, pageNumber, storedFilter, type Params, type StoredFilter } from "@/lib/staff-search";
import { filterProblems } from "./stored-filters";

// What the mailing pages show, loaded in one place so each page stays a
// call and a component.

/** A recipient, as the preview picks and fills in their email. */
export type PreviewRecipient = MailingRecipientValues & {
  id: number;
  name: string;
  constituency: string | null;
  email: string;
};

/** What a filter's pills say it in words with: the parties and asks it can name. */
export type FilterWordsData = { filter: StoredFilter; parties: string[]; asks: Ask[] };

/** What writing a mailing needs: who it's to, what its letter can use, and who it can be from. */
export type WriterData = FilterWordsData & {
  /** The values of the filter the site no longer knows. */
  unknown: string[];
  recipients: PreviewRecipient[];
  leftOut: LeftOut[];
  fields: MailingChoice[];
  conditions: MailingChoice[];
  /**
   * The connected Gmail accounts it can be sent from, with today's sends;
   * and the one writing it, whose a new mailing is from to start with.
   */
  senders: GmailAccount[];
  me: string;
  /** Whether a mailing can be sent yet. */
  sends: boolean;
};

async function writerData(filter: StoredFilter, me: string): Promise<WriterData> {
  const [audience, unknown, asks, parties, senders] = await Promise.all([
    politicianAudience(filter),
    filterProblems(filter),
    listAsks(),
    listParties(),
    gmailAccounts(),
  ]);
  return {
    filter,
    parties,
    asks,
    unknown,
    recipients: audience.recipients.map((r) => ({
      id: r.id,
      name: r.name,
      constituency: r.constituency,
      email: r.email!,
      values: r.values,
      meets: r.meets,
    })),
    leftOut: audience.leftOut,
    fields: audience.fields,
    conditions: audience.conditions,
    senders,
    me,
    sends: Boolean(mailingChannel("email")?.sendsMailings),
  };
}

/** A new mailing to the politicians the list's `params` find, written by `me`. */
export async function newMailingData(params: Params, me: string): Promise<WriterData> {
  return writerData(storedFilter("politicians", params), me);
}

export type MailingPageData =
  | { kind: "imported"; mailing: Mailing }
  | ({ kind: "draft"; draft: WrittenMailing } & WriterData)
  | ({ kind: "written"; mailing: Mailing; written: WrittenMailing } & FilterWordsData);

/**
 * A mailing's page: one imported from Airtable; a draft, to write, which
 * opening keeps from being tidied away; or one written here and scheduled
 * or sent, with a page of its recipients in a tab; as `me`, the staff member
 * looking. Undefined for none.
 */
export async function mailingPageData(
  id: number,
  search: { page?: string | string[]; tab?: string | string[] },
  me: string,
): Promise<MailingPageData | undefined> {
  const written = await getWrittenMailing(id);
  if (written?.state === "draft") {
    const draft = (await openWrittenMailing(id))!;
    return { kind: "draft", draft, ...(await writerData(draft.filter, me)) };
  }
  const tab = RECIPIENT_TABS.find((one) => one === firstOf(search.tab)) ?? "all";
  const mailing = await getMailing(id, pageNumber(firstOf(search.page)), tab as RecipientTab);
  if (!mailing) return undefined;
  if (!written) return { kind: "imported", mailing };
  const [asks, parties] = await Promise.all([listAsks(), listParties()]);
  return { kind: "written", mailing, written, filter: written.filter, asks, parties };
}
