import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { Muted } from "@/components/ui/Text";
import { listLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { filtersPath, type LettersSearch, lettersSearch } from "@/lib/staff-search";
import LetterFilters from "../_components/LetterFilters";
import LettersTable from "../_components/LettersTable";
import Paging from "../_components/Paging";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

export const metadata: Metadata = { title: staffCopy.letters.title };

export default async function LettersPage({ searchParams }: { searchParams: Promise<Partial<LettersSearch>> }) {
  const { email, permissions, sessions } = await requireStaff("supporters");
  const { filter, ...search } = lettersSearch(await searchParams);
  const { letters, total, pages } = await listLetters(filter);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="letters" />}>
      <h1>{staffCopy.letters.title}</h1>
      <LetterFilters search={search} />
      {total > 0 && (
        <p>
          <Muted>{staffCopy.letters.count(total, filter.page, pages)}</Muted>
        </p>
      )}
      <LettersTable letters={letters} />
      <Paging
        page={filter.page}
        pages={pages}
        href={(n) => filtersPath("/staff/letters", search, { page: n > 1 ? String(n) : "" })}
      />
    </StaffPage>
  );
}
