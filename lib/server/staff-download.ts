import "server-only";
import type { NextRequest } from "next/server";
import { now } from "@/lib/now";
import {
  downloadFormat,
  downloadName,
  toCsv,
  toJson,
  type DownloadColumn,
  type DownloadFormat,
} from "@/lib/staff-list";
import { logChange } from "./audit";
import { requireStaff, type StaffNeeds } from "./staff-auth";

/**
 * A staff list's rows as a file to save: CSV, with a byte-order mark so a
 * spreadsheet reads its accents as UTF-8, or JSON. Named for what it is, its
 * filters and now (downloadName), and never cached.
 */
export function downloadResponse<Row>(
  format: DownloadFormat,
  what: string,
  filters: string[],
  columns: DownloadColumn<Row>[],
  rows: Row[],
): Response {
  const body = format === "csv" ? `﻿${toCsv(columns, rows)}` : toJson(columns, rows);
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${downloadName(what, filters, now(), format)}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** What a list gives for a download: what it is, its filters in words, its columns and every row. */
export type Download<Row> = { what: string; filters: string[]; columns: DownloadColumn<Row>[]; rows: Row[] };

/**
 * A list's download route: for staff with the list's permission, the rows
 * `load` finds for the URL's filters, in the URL's `format`, or a 404 for
 * any other format. With `log`, each download goes in the audit log under
 * that action: its filters, format and how many rows, never the rows.
 */
export async function staffDownload<Row>(
  request: NextRequest,
  needs: StaffNeeds,
  load: (params: Record<string, string>) => Promise<Download<Row>>,
  log?: string,
): Promise<Response> {
  const { email } = await requireStaff(needs);
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const format = downloadFormat(params.format ?? null);
  if (!format) return new Response(null, { status: 404 });
  const { what, filters, columns, rows } = await load(params);
  if (log) await logChange(email, log, { filters, format, rows: rows.length });
  return downloadResponse(format, what, filters, columns, rows);
}
