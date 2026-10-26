import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listParties, listPoliticians, type PoliticiansSearch, politiciansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "../_components/PoliticianFilters";
import PoliticianTable from "../_components/PoliticianTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.politicians.title };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Partial<PoliticiansSearch>> }) {
  const { email, permissions, sessions } = await requireStaff();
  const { filter, ...search } = politiciansSearch(await searchParams);
  const [politicians, parties] = await Promise.all([listPoliticians(filter), listParties()]);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="politicians" />}>
      <h1>{staffCopy.politicians.title}</h1>
      <PoliticianFilters search={search} parties={parties} />
      <PoliticianTable politicians={politicians} search={search} />
    </StaffPage>
  );
}
