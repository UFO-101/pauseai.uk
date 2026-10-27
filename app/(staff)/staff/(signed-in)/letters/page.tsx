import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { type LettersSearch, lettersSearch } from "@/lib/staff-search";
import LetterFilters from "../../_components/LetterFilters";
import { LettersList } from "../../_components/LettersTable";

export const metadata: Metadata = { title: staffCopy.letters.title };

export default async function LettersPage({ searchParams }: { searchParams: Promise<Partial<LettersSearch>> }) {
  await requireStaff("supporters");
  const { filter, ...search } = lettersSearch(await searchParams);
  const { letters, total, pages, pageSize } = await listLetters(filter);
  return (
    <>
      <h1>{staffCopy.letters.title}</h1>
      <LetterFilters search={search} />
      <LettersList letters={letters} total={total} pages={pages} pageSize={pageSize} search={search} />
    </>
  );
}
