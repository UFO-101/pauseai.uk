import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import Actions from "@/components/ui/Actions";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SupportersPage } from "@/lib/server/supporters";
import type { SupportersSearch } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import SupporterBadges from "./SupporterBadges";
import styles from "./SupportersTable.module.css";

/** The list's URL with the same filters and another page. */
function pageHref(search: SupportersSearch, page: number): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(search)) {
    if (typeof value === "string" && value && name !== "page") params.set(name, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/staff/supporters?${query}` : "/staff/supporters";
}

/** The supporters found, a row each, and the way to the pages before and after. */
export default function SupportersTable({ page, search }: { page: SupportersPage; search: SupportersSearch }) {
  const copy = staffCopy.supporters;
  if (page.supporters.length === 0) return <p>{copy.none}</p>;
  const current = Number(search.page) || 1;
  return (
    <>
      <p>
        <Muted>{copy.count(page.total, current, page.pages)}</Muted>
      </p>
      <Table>
        <thead>
          <tr>
            <th>{copy.columns.name}</th>
            <th>{copy.columns.email}</th>
            <th>{copy.columns.badges}</th>
            <th>{copy.columns.firstSeen}</th>
            <th>{copy.columns.lastActive}</th>
            <th>{copy.columns.events}</th>
            <th>{copy.columns.letters}</th>
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
      )}
    </>
  );
}
