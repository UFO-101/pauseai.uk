import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAllLetters } from "@/lib/server/all-letters";
import { requireStaff } from "@/lib/server/staff-auth";
import { allLettersSearch, type AllLettersSearch, type ParamValue } from "@/lib/staff-search";
import AllLetters from "../../../_components/AllLetters";

export const metadata: Metadata = { title: staffCopy.allLetters.title };

/** Every letter to a politician, from supporters and from PauseAI, newest sent first. */
export default async function AllLettersPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<keyof AllLettersSearch, ParamValue>>>;
}) {
  await requireStaff("supporters");
  const { filter, ...search } = allLettersSearch(await searchParams);
  return <AllLetters found={await listAllLetters(filter)} search={search} />;
}
