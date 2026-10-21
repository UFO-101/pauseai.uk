import { staffCopy } from "@/lib/content/staff-interface";
import { recentLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { lettersSearch } from "@/lib/staff-search";
import LetterFilters from "../_components/LetterFilters";
import LettersTable from "../_components/LettersTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { email, permissions } = await requireStaff();
  const { status, filter } = lettersSearch(await searchParams);
  const letters = await recentLetters({ status: filter });
  return (
    <StaffPage nav={<StaffNav email={email} account permissions={permissions} current="letters" />}>
      <h1>{staffCopy.letters.title}</h1>
      <LetterFilters status={status} />
      <LettersTable letters={letters} />
    </StaffPage>
  );
}
