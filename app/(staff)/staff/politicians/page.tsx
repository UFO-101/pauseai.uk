import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import {
  listPoliticians,
  politicianParties,
  politiciansSearch,
  type PoliticiansSearch,
} from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "../_components/PoliticianFilters";
import PoliticianTable from "../_components/PoliticianTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.politicians.title };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Partial<PoliticiansSearch>> }) {
  const { email, permissions, sessions } = await requireStaff();
  const { filter, ...search } = politiciansSearch(await searchParams);
  const [politicians, asks, parties] = await Promise.all([listPoliticians(filter), listAsks(), politicianParties()]);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="politicians" />}>
      <h1>{staffCopy.politicians.title}</h1>
      <PoliticianFilters {...search} asks={asks} parties={parties} />
      <PoliticianTable politicians={politicians} asks={asks} search={search} />
    </StaffPage>
  );
}
