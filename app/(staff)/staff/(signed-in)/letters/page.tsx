import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listCampaigns } from "@/lib/server/asks";
import { listLetters } from "@/lib/server/letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { type LettersSearch, lettersSearch, type ParamValue } from "@/lib/staff-search";
import LetterFilters from "../../_components/LetterFilters";
import { LettersList } from "../../_components/LettersTable";

export const metadata: Metadata = { title: staffCopy.letters.title };

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<keyof LettersSearch, ParamValue>>>;
}) {
  await requireStaff("supporters");
  const { filter, ...search } = lettersSearch(await searchParams);
  const [{ letters, total, pages, pageSize }, campaigns] = await Promise.all([listLetters(filter), listCampaigns()]);
  return (
    <>
      <h1>{staffCopy.letters.title}</h1>
      <LetterFilters search={search} campaigns={campaigns} />
      <LettersList letters={letters} total={total} pages={pages} pageSize={pageSize} search={search} />
    </>
  );
}
