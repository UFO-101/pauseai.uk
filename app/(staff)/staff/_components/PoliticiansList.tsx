import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansPage, PoliticiansSearch } from "@/lib/server/politicians";
import { filtersPath, pageParam } from "@/lib/staff-search";
import ListCount from "./ListCount";
import Paging from "./Paging";
import PoliticianTable from "./PoliticianTable";
import Tabs from "./ui/Tabs";

const PATH = "/staff/politicians";
const copy = staffCopy.politicians;

/** The houses, as tabs over the list, each keeping the other filters and the sort, from the first page. */
export function HouseTabs({ search }: { search: PoliticiansSearch }) {
  const filters = { ...search, page: "" };
  const tabs = [
    { key: "", label: copy.allHouses, href: filtersPath(PATH, filters, { house: "" }) },
    ...Object.entries(staffCopy.houses).map(([house, label]) => ({
      key: house,
      label,
      href: filtersPath(PATH, filters, { house }),
    })),
  ];
  return (
    <Tabs label={staffCopy.fields.house} tabs={tabs} current={search.house in staffCopy.houses ? search.house : ""} />
  );
}

/**
 * The politicians page's list: how many, the table and the way through its
 * pages; or, when a search finds no one, the nearest names. Under it, how
 * many the search finds in other houses or out of office, linked to them.
 * A new filter or sort starts from the first page.
 */
export default function PoliticiansList({
  list,
  search,
  asks,
}: {
  list: PoliticiansPage;
  search: PoliticiansSearch;
  asks: Ask[];
}) {
  const filters = { ...search, page: "" };
  return (
    <>
      <ListCount total={list.total}>{copy.count(list.total, list.page, list.pages)}</ListCount>
      {list.closest.length > 0 ? (
        <>
          <p>{copy.closest}</p>
          <PoliticianTable politicians={list.closest} asks={asks} search={filters} />
        </>
      ) : (
        <>
          <PoliticianTable politicians={list.politicians} asks={asks} search={filters} />
          <Paging page={list.page} pages={list.pages} href={(n) => filtersPath(PATH, search, pageParam(n))} />
        </>
      )}
      {list.otherHouses > 0 && (
        <p>
          <Link href={filtersPath(PATH, filters, { house: "" })}>{copy.otherHouses(list.otherHouses)}</Link>
        </p>
      )}
      {list.outOfOffice > 0 && (
        <p>
          <Link href={filtersPath(PATH, filters, { status: "any" })}>{copy.outOfOffice(list.outOfOffice)}</Link>
        </p>
      )}
    </>
  );
}
