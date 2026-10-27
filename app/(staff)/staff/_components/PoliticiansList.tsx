import Link from "next/link";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansPage, PoliticiansSearch } from "@/lib/server/politicians";
import { filtersPath, pageParam } from "@/lib/staff-search";
import PoliticianTable, { politicianColumns } from "./PoliticianTable";
import ListFrame from "./ui/ListFrame";
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
    <Tabs
      label={staffCopy.fields.house}
      tabs={tabs}
      current={Object.hasOwn(staffCopy.houses, search.house) ? search.house : ""}
    />
  );
}

/**
 * The politicians page's list, in the list frame: how many, its downloads,
 * the table and the way through its pages; or, when a search finds no one,
 * the nearest names. Under it, how
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
      {list.closest.length > 0 ? (
        <>
          <p>{copy.closest}</p>
          <PoliticianTable politicians={list.closest} asks={asks} search={filters} />
        </>
      ) : (
        <ListFrame
          count={copy.total(list.total)}
          total={list.total}
          page={list.page}
          pages={list.pages}
          pageSize={list.pageSize}
          href={(n) => filtersPath(PATH, search, pageParam(n))}
          download={(format) => filtersPath(`${PATH}/download`, filters, { format })}
          formats={["csv", "json", "vcf"]}
          columns={politicianColumns(list.politicians, asks, filters)}
          rows={list.politicians}
          rowKey={(p) => p.id}
          empty={copy.none}
        />
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
