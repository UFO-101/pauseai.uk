import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { choosingMessage } from "@/lib/server/message-pages";
import { savedFiltersState } from "@/lib/server/saved-filters";
import { requireStaff } from "@/lib/server/staff-auth";
import { listSupporters, supporterChoices } from "@/lib/server/supporters";
import { supportersSearch, type SupportersSearch } from "@/lib/staff-search";
import { deleteFilter, renameFilter, saveFilter, updateFilter } from "../../saved-filter-actions";
import ErasedNotice from "../../_components/ErasedNotice";
import { ChoosingMessageFrame, MessageSupporters, NeedsContactFilter } from "../../_components/MessageSupporters";
import SupporterFilters, { supporterWords } from "../../_components/SupporterFilters";
import SupportersTable from "../../_components/SupportersTable";
import { filteredTitle } from "../../_components/ui/FilterBar";
import { keepFilterForMessage, newMessage } from "../../message-actions";

type Props = { searchParams: Promise<Partial<SupportersSearch>> };

/** The list's title, with its filters: the Near filter as typed, not looked up. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff("supporters");
  const search = supportersSearch((await savedFiltersState("supporters", await searchParams)).params);
  return { title: filteredTitle(staffCopy.supporters.title, supporterWords(search, await supporterChoices())) };
}

/** Everyone we know of, filtered, newest activity first; while it's choosing who a draft message goes to, the way back to it. */
export default async function SupportersPage({ searchParams }: Props) {
  await requireStaff("supporters");
  const saved = await savedFiltersState("supporters", await searchParams);
  const { filter, ...search } = supportersSearch(saved.params);
  const [page, choices, choosing] = await Promise.all([
    listSupporters(filter),
    supporterChoices(),
    choosingMessage(search.message),
  ]);
  return (
    <ChoosingMessageFrame choosing={choosing} search={search} total={page.total} keep={keepFilterForMessage}>
      <h1>{staffCopy.supporters.title}</h1>
      <ErasedNotice erased={search.erased} why={search.why} />
      <SupporterFilters
        search={search}
        choices={choices}
        near={page.near}
        saved={{
          state: saved,
          actions: { save: saveFilter, update: updateFilter, rename: renameFilter, remove: deleteFilter },
        }}
      />
      <NeedsContactFilter search={search} />
      <SupportersTable
        page={page}
        search={search}
        actions={<MessageSupporters search={search} total={page.total} action={newMessage} choosing={choosing} />}
      />
    </ChoosingMessageFrame>
  );
}
