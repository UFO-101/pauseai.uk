import "server-only";
import { isLettersInboxAddress } from "./letters-inbox";
import { RECIPIENT_TABS, getMailing, type Mailing, type RecipientTab } from "./mailings";
import type { MailingChoice } from "@/lib/mailing-fields";
import type { MailingRecipientValues } from "@/lib/mailing-doc";
import { listAsks, type Ask } from "./asks";
import { gmailAccounts, type GmailAccount } from "./gmail-accounts";
import { mailingChannel } from "./mailing-channels";
import { choosingFor, getWrittenMailing, openWrittenMailing, type WrittenMailing } from "./mailing-drafts";
import { politicianAudience, type LeftOut } from "./mailing-recipients";
import {
  countPoliticians,
  findPastedLines,
  listParties,
  politicianNames,
  politiciansPage,
  politiciansSearch,
  type PoliticiansSearch,
} from "./politicians";
import type { ParamValue } from "@/lib/staff-search";
import { firstOf, pageNumber, type StoredFilter } from "@/lib/staff-search";
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

/**
 * What a mailing's pills say who it's to with: the parties and asks its
 * filter can name, and the names of those ticked and of those its group
 * found, by ID.
 */
export type FilterWordsData = { filter: StoredFilter; parties: string[]; asks: Ask[]; names: Record<number, string> };

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

/** The names of those ticked for a mailing, and of those its group found, by ID. */
async function namesOf(filter: StoredFilter): Promise<Record<number, string>> {
  const ids = [...(filter.picked?.ids ?? []), ...(filter.picked?.from?.found ?? [])];
  return politicianNames(ids);
}

async function writerData(filter: StoredFilter, me: string): Promise<WriterData> {
  const [audience, unknown, asks, parties, senders, names] = await Promise.all([
    politicianAudience(filter),
    filterProblems(filter),
    listAsks(),
    listParties(),
    gmailAccounts(),
    namesOf(filter),
  ]);
  return {
    filter,
    parties,
    asks,
    names,
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
    // Never the letters inbox, which sends supporters' letters and nothing else.
    senders: senders.filter((sender) => !isLettersInboxAddress(sender.email)),
    me,
    sends: Boolean(mailingChannel("email")?.sendsMailings),
  };
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
  const [asks, parties, names] = await Promise.all([listAsks(), listParties(), namesOf(written.filter)]);
  return { kind: "written", mailing, written, filter: written.filter, asks, parties, names };
}

/**
 * The politicians page, from its URL: the list, and the asks and parties
 * its filters choose among; while it's choosing who a draft is for, that
 * draft, how many of those the filters find are ticked, and the lines
 * pasted, each with who it found. On the ticked tab, the list is those
 * ticked, in place of what the filters find; on it and the pasted tab, the
 * filters are hidden.
 */
export async function politiciansPageData(params: Partial<Record<keyof PoliticiansSearch, ParamValue>>) {
  const { filter, ...search } = politiciansSearch(params);
  const choosing = await choosingFor(search.mailing);
  const onTicked = Boolean(choosing && search.tab === "ticked");
  const shown = onTicked ? { ids: choosing!.ticked, sort: filter.sort, page: filter.page } : filter;
  const [list, asks, parties, tickedHere, pasted] = await Promise.all([
    politiciansPage(shown),
    listAsks(),
    listParties(),
    choosing ? countPoliticians({ ...filter, ids: choosing.ticked }) : 0,
    choosing ? findPastedLines(search.pasted) : { lines: [], skipped: 0 },
  ]);
  // The filters choose only the list's own view, not the ticked or pasted tabs.
  return { search, choosing, filtersHidden: Boolean(choosing && search.tab), list, asks, parties, tickedHere, pasted };
}
