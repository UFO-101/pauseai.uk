import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listPoliticians, politiciansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "../_components/PoliticianFilters";
import { markSigned } from "../actions";
import PoliticianTable from "../_components/PoliticianTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

type Search = { q?: string; house?: string; campaign?: string; email?: string; sort?: string; dir?: string };

export const metadata: Metadata = { title: staffCopy.politicians.title };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email, permissions } = await requireStaff();
  const { q, house, campaign, email: emailFilter, sort, dir, filter } = politiciansSearch(await searchParams);
  const politicians = await listPoliticians(filter);
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="politicians" />}>
      <h1>{staffCopy.politicians.title}</h1>
      <PoliticianFilters search={q} house={house} campaign={campaign} email={emailFilter} />
      <PoliticianTable
        politicians={politicians}
        markSigned={markSigned}
        search={{ q, house, campaign, email: emailFilter, sort, dir }}
      />
    </StaffPage>
  );
}
