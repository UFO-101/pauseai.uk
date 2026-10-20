import { staffCopy } from "@/lib/content/staff-interface";
import { listPoliticians, politiciansSearch } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "../_components/PoliticianFilters";
import { markSigned } from "../actions";
import PoliticianTable from "../_components/PoliticianTable";
import StaffHeader from "../_components/StaffHeader";
import StaffPage from "../_components/ui/StaffPage";

type Search = { q?: string; house?: string; campaign?: string; email?: string };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { q, house, campaign, email: emailFilter, filter } = politiciansSearch(await searchParams);
  const politicians = await listPoliticians(filter);
  return (
    <StaffPage>
      <StaffHeader email={email} current="politicians" />
      <h1>{staffCopy.politicians.title}</h1>
      <PoliticianFilters search={q} house={house} campaign={campaign} email={emailFilter} />
      <PoliticianTable politicians={politicians} markSigned={markSigned} />
    </StaffPage>
  );
}
