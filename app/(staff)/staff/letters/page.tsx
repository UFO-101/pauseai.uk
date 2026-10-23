import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { type LettersSearch, lettersSearch } from "@/lib/staff-search";
import LetterFilters from "../_components/LetterFilters";
import LettersTable from "../_components/LettersTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.letters.title };

export default async function LettersPage({ searchParams }: { searchParams: Promise<Partial<LettersSearch>> }) {
  const { email, permissions } = await requireStaff("supporters");
  const { filter, ...search } = lettersSearch(await searchParams);
  const letters = await recentLetters(filter);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} current="letters" />}>
      <h1>{staffCopy.letters.title}</h1>
      <LetterFilters search={search} />
      <LettersTable letters={letters} />
    </StaffPage>
  );
}
