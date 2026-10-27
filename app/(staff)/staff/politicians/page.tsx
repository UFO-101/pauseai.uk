import type { Metadata } from "next";
import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import { listAsks } from "@/lib/server/asks";
import {
  closestPoliticians,
  countPoliticians,
  HOUSES,
  listParties,
  POLITICIANS_PAGE_SIZE,
  listPoliticians,
  politiciansSearch,
  type PoliticiansSearch,
} from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { filtersPath } from "@/lib/staff-search";
import PoliticianFilters from "../_components/PoliticianFilters";
import Paging from "../_components/Paging";
import PoliticianTable from "../_components/PoliticianTable";
import { Muted } from "@/components/ui/Text";
import StaffNav from "../_components/StaffNav";
import StaffPage from "../_components/ui/StaffPage";
import Tabs from "../_components/ui/Tabs";

const PATH = "/staff/politicians";

export const metadata: Metadata = { title: staffCopy.politicians.title };

export default async function PoliticiansPage({ searchParams }: { searchParams: Promise<Partial<PoliticiansSearch>> }) {
  const { email, permissions, sessions } = await requireStaff();
  const { filter, ...search } = politiciansSearch(await searchParams);
  const [politicians, total, asks, parties] = await Promise.all([
    listPoliticians(filter),
    countPoliticians(filter),
    listAsks(),
    listParties(),
  ]);
  const page = filter.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / POLITICIANS_PAGE_SIZE));
  // Any change of filter or sort starts again from the first page.
  const filters = { ...search, page: "" };
  // A search of those in office says under the list how many others it
  // finds, and one of a house that finds no one there, how many it finds in
  // the others; one that finds no one offers the nearest names.
  const { search: text } = filter;
  const none = text && politicians.length === 0;
  const [outOfOffice, otherHouses, closest] = await Promise.all([
    text && filter.status === "in_office" ? countPoliticians({ ...filter, status: "out" }) : 0,
    none && filter.house ? countPoliticians({ ...filter, house: undefined }) : 0,
    none ? closestPoliticians({ ...filter, search: text }) : [],
  ]);
  const houses = [
    { key: "", label: staffCopy.politicians.allHouses, href: filtersPath(PATH, filters, { house: "" }) },
    ...HOUSES.map((house) => ({
      key: house,
      label: staffCopy.houses[house],
      href: filtersPath(PATH, filters, { house }),
    })),
  ];
  return (
    <StaffPage nav={<StaffNav email={email} permissions={permissions} sessions={sessions} current="politicians" />}>
      <h1>{staffCopy.politicians.title}</h1>
      <Tabs label={staffCopy.fields.house} tabs={houses} current={filter.house ?? ""} />
      <PoliticianFilters search={search} asks={asks} parties={parties} />
      {total > 0 && (
        <p>
          <Muted>{staffCopy.politicians.count(total, page, pages)}</Muted>
        </p>
      )}
      {closest.length > 0 ? (
        <>
          <p>{staffCopy.politicians.closest}</p>
          <PoliticianTable politicians={closest} asks={asks} search={filters} />
        </>
      ) : (
        <>
          <PoliticianTable politicians={politicians} asks={asks} search={filters} />
          <Paging page={page} pages={pages} href={(n) => filtersPath(PATH, search, { page: n > 1 ? String(n) : "" })} />
        </>
      )}
      {otherHouses > 0 && (
        <p>
          <Link href={filtersPath(PATH, filters, { house: "" })}>{staffCopy.politicians.otherHouses(otherHouses)}</Link>
        </p>
      )}
      {outOfOffice > 0 && (
        <p>
          <Link href={filtersPath(PATH, filters, { status: "any" })}>
            {staffCopy.politicians.outOfOffice(outOfOffice)}
          </Link>
        </p>
      )}
    </StaffPage>
  );
}
