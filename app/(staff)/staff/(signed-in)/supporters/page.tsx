import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { listSupporters, supporterChoices } from "@/lib/server/supporters";
import { supportersSearch, type SupportersSearch } from "@/lib/staff-search";
import ErasedNotice from "../../_components/ErasedNotice";
import SupporterFilters, { supporterWords } from "../../_components/SupporterFilters";
import SupportersTable from "../../_components/SupportersTable";
import { filteredTitle } from "../../_components/ui/FilterBar";

type Props = { searchParams: Promise<Partial<SupportersSearch>> };

/** The list's title, with its filters: the Near filter as typed, not looked up. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff("supporters");
  const search = supportersSearch(await searchParams);
  return { title: filteredTitle(staffCopy.supporters.title, supporterWords(search, await supporterChoices())) };
}

/** Everyone we know of, filtered, newest activity first. */
export default async function SupportersPage({ searchParams }: Props) {
  await requireStaff("supporters");
  const { filter, ...search } = supportersSearch(await searchParams);
  const [page, choices] = await Promise.all([listSupporters(filter), supporterChoices()]);
  return (
    <>
      <h1>{staffCopy.supporters.title}</h1>
      <ErasedNotice erased={search.erased} />
      <SupporterFilters search={search} choices={choices} near={page.near} />
      <SupportersTable page={page} search={search} />
    </>
  );
}
