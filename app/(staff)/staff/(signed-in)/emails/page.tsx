import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { emailPeople, listAllLetters } from "@/lib/server/all-letters";
import { oneOffInbox } from "@/lib/server/one-off-emails";
import { requireStaff } from "@/lib/server/staff-auth";
import { allLettersSearch, type AllLettersSearch, type ParamValue } from "@/lib/staff-search";
import AllLetters from "../../_components/AllLetters";

export const metadata: Metadata = { title: staffCopy.allLetters.title };

/** Every email with a politician, a row for each letter and one-off thread, newest first; what staff without `supporters` may see. */
export default async function AllEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<keyof AllLettersSearch, ParamValue>>>;
}) {
  const { permissions } = await requireStaff();
  const supporters = permissions.includes("supporters");
  const { filter, ...search } = allLettersSearch(await searchParams);
  const [found, people] = await Promise.all([listAllLetters(filter, supporters), emailPeople(supporters)]);
  return <AllLetters found={found} people={people} search={search} supporters={supporters} inbox={oneOffInbox()} />;
}
