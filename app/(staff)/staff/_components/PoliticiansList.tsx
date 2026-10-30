import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { Ask } from "@/lib/server/asks";
import type { PoliticiansPage, PoliticiansSearch } from "@/lib/server/politicians";
import { filtersPath, NEW_MAILING, pageParam, storedFilter, valuesOf } from "@/lib/staff-search";
import PoliticianTable, { politicianColumns } from "./PoliticianTable";
import styles from "./PoliticiansList.module.css";
import ListFrame from "./ui/ListFrame";
import Strip from "./ui/Strip";
import Tabs from "./ui/Tabs";
import StaffLink from "./ui/StaffLink";

const PATH = "/staff/politicians";
const copy = staffCopy.politicians;
const mailingCopy = staffCopy.mailingPages;

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

/** The action that makes a draft go to who a form's filter finds (changeMailingWho). */
export type ChangeWho = (form: FormData) => Promise<void>;

/**
 * The page (`children`), and over it, while the list is choosing who a
 * mailing is for (`search.mailing`), a strip saying what to do, for a new
 * mailing or for the draft titled `title`, with the way back, choosing no
 * one. The strip is held at the top of the window as the page scrolls, so
 * what's being done, and how to stop, stay in sight. It's held inside a
 * plain box around the whole page, which is the page's first element: the
 * router scrolls a new page's first element into view, and a held one, at
 * the top, it scrolls the page past.
 */
export function ChoosingHead({
  search,
  title,
  children,
}: {
  search: PoliticiansSearch;
  title?: string;
  children: ReactNode;
}) {
  if (!search.mailing) return children;
  const isNew = search.mailing === NEW_MAILING;
  return (
    <div>
      <div className={styles.held}>
        <Strip
          action={
            <StaffLink href={isNew ? "/staff/mailings" : `/staff/mailings/${search.mailing}`}>
              {isNew ? mailingCopy.cancelNew : mailingCopy.backToDraft}
            </StaffLink>
          }
        >
          <span>{isNew ? mailingCopy.choosingNew : mailingCopy.choosingDraft(title ?? mailingCopy.untitled)}</span>
          <span className={styles.how}>{isNew ? mailingCopy.choosingHowNew : mailingCopy.choosingHowDraft}</span>
        </Strip>
      </div>
      {children}
    </div>
  );
}

/**
 * What to do with everyone the list's filters find while choosing who a
 * mailing is for: a new one's written to them; a draft, after its Change
 * who, goes to them instead, by `changeWho`.
 */
function TakeThese({ search, total, changeWho }: { search: PoliticiansSearch; total: number; changeWho: ChangeWho }) {
  const who = storedFilter("politicians", search).params;
  if (search.mailing === NEW_MAILING) {
    return (
      <StaffLink
        className={buttonClass({ variant: "primary", fit: true })}
        href={filtersPath("/staff/mailings/new", who)}
      >
        {mailingCopy.writeToThese(total)}
      </StaffLink>
    );
  }
  return (
    <form action={changeWho}>
      <input type="hidden" name="id" value={search.mailing} />
      {Object.entries(who).flatMap(([name, value]) =>
        valuesOf(value).map((one) => <input key={`${name}=${one}`} type="hidden" name={name} value={one} />),
      )}
      <SubmitButton variant="primary" fit>
        {mailingCopy.useThese(total)}
      </SubmitButton>
    </form>
  );
}

/**
 * The bar at the foot of the window while the list is choosing who a
 * mailing is for: how many the filters find, and the button that takes
 * them. It stays in sight as the list scrolls, so the way on is always there.
 */
function ChoosingBar({ search, total, changeWho }: { search: PoliticiansSearch; total: number; changeWho: ChangeWho }) {
  return (
    <div className={styles.bar} role="region" aria-label={mailingCopy.choosingCount(total)}>
      <span className={styles.count}>{mailingCopy.choosingCount(total)}</span>
      <TakeThese search={search} total={total} changeWho={changeWho} />
    </div>
  );
}

/**
 * The politicians page's list, in the list frame: how many, Mail these, its downloads,
 * the table and the way through its pages; or, when a search finds no one,
 * the nearest names. Under it, how
 * many the search finds in other houses, out of office or among the test
 * politicians, linked to them. While it's choosing who a mailing is for,
 * the bar at the foot takes the place of Mail these.
 * A new filter or sort starts from the first page.
 */
export default function PoliticiansList({
  list,
  search,
  asks,
  changeWho,
}: {
  list: PoliticiansPage;
  search: PoliticiansSearch;
  asks: Ask[];
  changeWho: ChangeWho;
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
          actions={
            search.mailing ? undefined : (
              <StaffLink
                className={buttonClass({ variant: "primary", size: "small", fit: true })}

                href={filtersPath("/staff/mailings/new", storedFilter("politicians", search).params)}
              >
                {mailingCopy.mailThese(list.total)}
              </StaffLink>
            )
          }
          formats={["csv", "json", "vcf"]}
          columns={politicianColumns(asks, filters)}
          rows={list.politicians}
          rowKey={(p) => p.id}
          empty={copy.none}
        />
      )}
      {list.otherHouses > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { house: "" })}>{copy.otherHouses(list.otherHouses)}</StaffLink>
        </p>
      )}
      {list.outOfOffice > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { status: "any" })}>
            {copy.outOfOffice(list.outOfOffice)}
          </StaffLink>
        </p>
      )}
      {list.tests > 0 && (
        <p>
          <StaffLink href={filtersPath(PATH, filters, { flag: "test" })}>{copy.tests(list.tests)}</StaffLink>
        </p>
      )}
      {search.mailing && <ChoosingBar search={search} total={list.total} changeWho={changeWho} />}
    </>
  );
}
