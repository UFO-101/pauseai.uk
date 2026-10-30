import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import { choosingTitle } from "@/lib/server/mailings";
import { listParties, politiciansPage, politiciansSearch, type PoliticiansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { changeMailingWho } from "../../mailing-actions";
import PoliticianFilters, { politicianWords } from "../../_components/PoliticianFilters";
import PoliticiansList, { ChoosingStrip, HouseTabs } from "../../_components/PoliticiansList";
import { filteredTitle } from "../../_components/ui/FilterBar";

type Props = { searchParams: Promise<Partial<PoliticiansSearch>> };

/** The list's title, with its house and filters. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await requireStaff();
  const search = politiciansSearch(await searchParams);
  const [asks, parties] = await Promise.all([listAsks(), listParties()]);
  return { title: filteredTitle(staffCopy.politicians.title, politicianWords(search, parties, asks)) };
}

export default async function PoliticiansPage({ searchParams }: Props) {
  await requireStaff();
  const { filter, ...search } = politiciansSearch(await searchParams);
  const [list, asks, parties, title] = await Promise.all([
    politiciansPage(filter),
    listAsks(),
    listParties(),
    choosingTitle(search.mailing),
  ]);
  return (
    <>
      <ChoosingStrip search={search} title={title} />
      <h1>{staffCopy.politicians.title}</h1>
      <HouseTabs search={search} />
      <PoliticianFilters search={search} asks={asks} parties={parties} />
      <PoliticiansList list={list} search={search} asks={asks} changeWho={changeMailingWho} />
    </>
  );
}
