import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import Actions from "@/components/ui/Actions";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersPage } from "@/lib/server/supporters";
import type { SupportersSearch } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import { parseSort, sortHref } from "@/lib/staff-sort";
import { SUPPORTER_SORTS, type SupporterSort } from "@/lib/supporters";
import SortHeading from "./SortHeading";
import SupporterBadges from "./SupporterBadges";
import styles from "./SupportersTable.module.css";

/** The list's filters as typed, the URL's, without the page or the notice. */
function filtersOf(search: SupportersSearch): Record<string, string> {
  const { page, erased, filter, ...rest } = search as SupportersSearch & { filter?: unknown };
  void page;
  void erased;
  void filter;
  return rest;
}

/** The list's URL with the same filters and sort, and another page. */
function pageHref(search: SupportersSearch, page: number): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filtersOf(search))) if (value) params.set(name, value);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/staff/supporters?${query}` : "/staff/supporters";
}

/** The supporters found, a row each, and the way to the pages before and after. */
export default function SupportersTable({ page, search }: { page: SupportersPage; search: SupportersSearch }) {
  const copy = staffCopy.supporters;
  if (page.supporters.length === 0) return <p>{copy.none}</p>;
  const current = Number(search.page) || 1;
  const sort = parseSort(SUPPORTER_SORTS, "active", search.sort, search.dir);
  const heading = (key: SupporterSort, label: string) => (
    <SortHeading
      sortKey={key}
      current={sort}
      href={sortHref("/staff/supporters", filtersOf(search), SUPPORTER_SORTS, sort, key)}
    >
      {label}
    </SortHeading>
  );
  return (
    <>
      <p>
        <Muted>{copy.count(page.total, current, page.pages)}</Muted>
      </p>
      <Table>
        <thead>
          <tr>
            {heading("name", copy.columns.name)}
            <th>{copy.columns.email}</th>
            <th>{copy.columns.badges}</th>
            {heading("first", copy.columns.firstSeen)}
            {heading("active", copy.columns.lastActive)}
            {heading("events", copy.columns.events)}
            {heading("letters", copy.columns.letters)}
            <th>{copy.columns.optedOut}</th>
          </tr>
        </thead>
        <tbody>
          {page.supporters.map((supporter) => (
            <tr key={supporter.id}>
              <td>
                <Link href={`/staff/supporters/${supporter.id}`}>{supporter.name ?? copy.noName}</Link>
              </td>
              <td>
                {supporter.emails[0]}
                {supporter.emails.length > 1 && <Muted> {copy.moreEmails(supporter.emails.length - 1)}</Muted>}
              </td>
              <td>
                <div className={styles.badges}>
                  <SupporterBadges supporter={supporter} />
                </div>
              </td>
              <td>{supporter.firstSeenAt && staffDate(supporter.firstSeenAt)}</td>
              <td>{supporter.lastActiveAt && staffDate(supporter.lastActiveAt)}</td>
              <td>{supporter.events}</td>
              <td>{supporter.letters}</td>
              <td>{supporter.optedOut.map((list) => copy.lists[list]).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {page.pages > 1 && (
        <div className={styles.paging}>
          <Actions>
            {current > 1 && (
              <ButtonLink variant="ghost" size="small" href={pageHref(search, current - 1)}>
                {copy.previous}
              </ButtonLink>
            )}
            {current < page.pages && (
              <ButtonLink variant="ghost" size="small" href={pageHref(search, current + 1)}>
                {copy.next}
              </ButtonLink>
            )}
          </Actions>
        </div>
      )}
    </>
  );
}
