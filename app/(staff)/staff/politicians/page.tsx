import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import { listParties, politiciansPage, politiciansSearch, type PoliticiansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "../_components/PoliticianFilters";
import PoliticiansList, { HouseTabs } from "../_components/PoliticiansList";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.politicians.title };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Partial<PoliticiansSearch>> }) {
  const { email, permissions, sessions } = await requireStaff();
  const { filter, ...search } = politiciansSearch(await searchParams);
  const [list, asks, parties] = await Promise.all([politiciansPage(filter), listAsks(), listParties()]);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="politicians" />}>
      <h1>{staffCopy.politicians.title}</h1>
      <HouseTabs search={search} />
      <PoliticianFilters search={search} asks={asks} parties={parties} />
      <PoliticiansList list={list} search={search} asks={asks} />
    </StaffPage>
  );
}
