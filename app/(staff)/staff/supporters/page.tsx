import type { Metadata } from "next";
import { staffCopy } from "@/lib/content/staff-interface";
import { requireStaff } from "@/lib/server/staff-auth";
import { eventChoices, listSupporters } from "@/lib/server/supporters";
import { supportersSearch, type SupportersSearch } from "@/lib/staff-search";
import ErasedNotice from "../_components/ErasedNotice";
import SupporterFilters from "../_components/SupporterFilters";
import SupportersTable from "../_components/SupportersTable";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";

/** Everyone we know of, filtered, newest activity first. */
export const metadata: Metadata = { title: staffCopy.supporters.title };

export default async function SupportersPage({ searchParams }: { searchParams: Promise<Partial<SupportersSearch>> }) {
  const { email, permissions, sessions } = await requireStaff("supporters");
  const { filter, ...search } = supportersSearch(await searchParams);
  const [page, events] = await Promise.all([listSupporters(filter), eventChoices()]);
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="supporters" />}>
      <h1>{staffCopy.supporters.title}</h1>
      <ErasedNotice erased={search.erased} />
      <SupporterFilters search={search} events={events} near={page.near} />
      <SupportersTable page={page} search={search} />
    </StaffPage>
  );
}
