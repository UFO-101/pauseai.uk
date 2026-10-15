import { staffCopy } from "@/lib/content/staff-interface";
import { isHouse, listPoliticians } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import PoliticianFilters from "./_components/PoliticianFilters";
import PoliticianTable from "./_components/PoliticianTable";
import StaffHeader from "./_components/StaffHeader";
import styles from "./_components/staff.module.css";

type Search = { q?: string; house?: string; campaign?: string };

export default async function StaffHome({ searchParams }: { searchParams: Promise<Search> }) {
  const { email } = await requireStaff();
  const { q = "", house = "", campaign = "" } = await searchParams;
  const politicians = await listPoliticians({
    search: q || undefined,
    house: isHouse(house) ? house : undefined,
    campaign: campaign || undefined,
  });
  return (
    <main className={`container ${styles.page}`}>
      <StaffHeader email={email} />
      <h1>{staffCopy.politicians.title}</h1>
      <PoliticianFilters search={q} house={house} campaign={campaign} />
      <PoliticianTable politicians={politicians} />
    </main>
  );
}
