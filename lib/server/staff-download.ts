import "server-only";
import type { NextRequest } from "next/server";
import { now } from "@/lib/now";
import { siteUrl } from "@/lib/site-url";
import {
  downloadFormat,
  downloadName,
  toCsv,
  toJson,
  type DownloadColumn,
  type DownloadFormat,
} from "@/lib/staff-list";
import { firstOf, type ParamValue } from "@/lib/staff-search";
import { vcardCode, vcardFile, type Contact } from "@/lib/vcard";
import { logChange } from "./audit";

/** Each format's media type. */
const TYPES: Record<DownloadFormat, string> = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  vcf: "text/vcard; charset=utf-8",
};

/** The byte-order mark, so a spreadsheet reads a CSV's accents as UTF-8. */
const BOM = "\uFEFF";

/**
 * A staff list's rows as a file to save: CSV, with a byte-order mark; JSON;
 * or `cards`, made already, for a vCard file. Named for what it is, its
 * filters and now (downloadName), and never cached.
 */
export function downloadResponse<Row>(
  format: DownloadFormat,
  what: string,
  filters: string[],
  columns: DownloadColumn<Row>[],
  rows: Row[],
  cards = "",
): Response {
  const body = { csv: () => `${BOM}${toCsv(columns, rows)}`, json: () => toJson(columns, rows), vcf: () => cards }[
    format
  ]();
  return new Response(body, {
    headers: {
      "Content-Type": TYPES[format],
      "Content-Disposition": `attachment; filename="${downloadName(what, filters, now(), format)}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * What a list gives for a download: what it is, its filters in words, its
 * columns and every row; and for a list of people, each as a contact, for
 * a vCard file.
 */
export type Download<Row> = {
  what: string;
  filters: string[];
  columns: DownloadColumn<Row>[];
  rows: Row[];
  contact?: (row: Row) => Contact;
};

/**
 * A list's download route, for `email`, once the route has checked they may
 * (requireStaff): the rows
 * `load` finds for the URL's filters, in the URL's `format`, or a 404 for
 * any other format, or vCards from a list that isn't of people. A vCard
 * file's contacts are named with a code of its own, which its filename has
 * too. With `log`, each download goes in the audit log under that action:
 * its filters, format, code and how many rows, never the rows.
 */
export async function staffDownload<Row>(
  request: NextRequest,
  email: string,
  load: (params: Record<string, ParamValue>) => Promise<Download<Row>>,
  log?: string,
): Promise<Response> {
  // Each parameter, a list where it repeats, as a page's search params have it.
  const search = request.nextUrl.searchParams;
  const params = Object.fromEntries(
    [...new Set(search.keys())].map((key) => {
      const all = search.getAll(key);
      return [key, all.length > 1 ? all : all[0]];
    }),
  );
  const format = downloadFormat(firstOf(params.format) || null);
  if (!format) return new Response(null, { status: 404 });
  const { what, filters, columns, rows, contact } = await load(params);
  if (format === "vcf" && !contact) return new Response(null, { status: 404 });
  const code = format === "vcf" ? vcardCode() : undefined;
  const cards = contact && code ? vcardFile(rows.map(contact), code, siteUrl("/", request).origin) : "";
  if (log) await logChange(email, log, { filters, format, rows: rows.length, ...(code && { code }) });
  return downloadResponse(format, what, code ? [...filters, code] : filters, columns, rows, cards);
}
