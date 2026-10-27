import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { pageRange, type DownloadColumn, type DownloadFormat } from "@/lib/staff-list";
import styles from "./ListFrame.module.css";

/**
 * A column of a staff list: its heading, its cell, and its value in a
 * download (lib/staff-list.ts). `heading` is its own <th>, such as a
 * SortHeading, in place of the label's. A `short` column's cells never
 * wrap, so the long ones take the room left.
 */
export type ListColumn<Row> = DownloadColumn<Row> & {
  cell: (row: Row) => ReactNode;
  heading?: ReactNode;
  short?: boolean;
  className?: string;
};

/** Rows as a striped table, a column each. */
export function ListTable<Row>({
  columns,
  rows,
  rowKey,
}: {
  columns: ListColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
}) {
  const cellClass = (column: ListColumn<Row>) =>
    [column.short && styles.short, column.className].filter(Boolean).join(" ") || undefined;
  return (
    <Table>
      <thead>
        <tr>{columns.map((column) => column.heading ?? <th key={column.key}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} className={cellClass(column)}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Under a list of more than one page: Previous, the pages, Next; on a phone, "Page 6 of 50" for the pages. */
function Paging({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  const copy = staffCopy.paging;
  return (
    <nav aria-label={copy.label} className={styles.pages}>
      {page > 1 && (
        <ButtonLink variant="ghost" size="small" fit href={href(page - 1)} rel="prev">
          {copy.previous}
        </ButtonLink>
      )}
      <ol className={styles.numbers}>
        {pageRange(page, pages).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className={styles.gap}>
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" aria-label={copy.page(n)} className={styles.current}>
                  {n}
                </span>
              ) : (
                <Link href={href(n)} aria-label={copy.page(n)} className={styles.number}>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      <span className={styles.of}>{copy.of(page, pages)}</span>
      {page < pages && (
        <ButtonLink variant="ghost" size="small" fit href={href(page + 1)} rel="next">
          {copy.next}
        </ButtonLink>
      )}
    </nav>
  );
}

type Props<Row> = {
  /** How many the list has, in words: "250 politicians". */
  count: string;
  total: number;
  /** This page, from 1, of `pages`, each `pageSize` rows. */
  page: number;
  pages: number;
  pageSize: number;
  /** The list's URL at another page. */
  href: (page: number) => string;
  /** The URL of every row the list's filters find, in a format; none for a list with no downloads. */
  download?: (format: DownloadFormat) => string;
  columns: ListColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  /** What a list with nothing in it says instead. */
  empty: ReactNode;
};

/**
 * Every staff list (docs/style-guide.md, "Lists"): over the table, how
 * many and which of them this page shows, and buttons to download all of
 * them, every page; the striped table; and under it, which rows these are and the way
 * to the other pages. It's as wide as the window, past the content's
 * width, so a wide table wraps less.
 */
export default function ListFrame<Row>({
  count,
  total,
  page,
  pages,
  pageSize,
  href,
  download,
  columns,
  rows,
  rowKey,
  empty,
}: Props<Row>) {
  if (total === 0) return <p>{empty}</p>;
  const copy = staffCopy.lists;
  const from = (page - 1) * pageSize + 1;
  const to = from + rows.length - 1;
  return (
    <div className={styles.frame}>
      <div className={styles.bar}>
        <p className={styles.count}>
          <strong>{count}</strong>
          {pages > 1 && <Muted> · {copy.showing(from, to)}</Muted>}
        </p>
        {download && (
          <div className={styles.downloads}>
            {(["csv", "json"] as const).map((format) => (
              <ButtonAnchor key={format} variant="ghost" size="small" fit href={download(format)} download>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
                </svg>
                {copy.formats[format]}
              </ButtonAnchor>
            ))}
          </div>
        )}
      </div>
      <ListTable columns={columns} rows={rows} rowKey={rowKey} />
      {pages > 1 && (
        <div className={styles.under}>
          <Muted>{staffCopy.paging.range(from, to, total)}</Muted>
          <Paging page={page} pages={pages} href={href} />
        </div>
      )}
    </div>
  );
}
