// A staff list's parts that aren't drawn: which page numbers its paging
// offers, its rows as a download, and the download's filename.

/** A download's format. */
export type DownloadFormat = "csv" | "json";

/** The format a download's URL asks for, or undefined for any other. */
export function downloadFormat(format: string | null): DownloadFormat | undefined {
  return format === "csv" || format === "json" ? format : undefined;
}

/** A value in a download: text, a number, yes or no, or nothing. */
export type DownloadValue = string | number | boolean | null;

/**
 * One column of a list as a download: its key in JSON, its heading in CSV,
 * and each row's value. A column without `text`, such as a button, is left
 * out of downloads.
 */
export type DownloadColumn<Row> = { key: string; label: string; text?: (row: Row) => DownloadValue };

/** The columns a download has: those with a value. */
function downloaded<Row>(columns: DownloadColumn<Row>[]) {
  return columns.filter((c): c is Required<DownloadColumn<Row>> => Boolean(c.text));
}

/**
 * The pages the paging links to: the first, the last, and two either side
 * of this one, with a gap ("…") where pages are left out, but never a gap
 * standing for one page, which is shown instead.
 */
export function pageRange(page: number, pages: number): (number | "gap")[] {
  const near = (n: number) => n === 1 || n === pages || Math.abs(n - page) <= 2;
  const shown = [...Array(pages).keys()].map((i) => i + 1).filter((n) => near(n) || (near(n - 1) && near(n + 1)));
  return shown.flatMap((n, i) => (i > 0 && n - shown[i - 1] > 1 ? ["gap" as const, n] : [n]));
}

/**
 * A CSV field: quoted when it holds a comma, a quote or a line break, its
 * quotes doubled. Text a spreadsheet would run as a formula (starting =, +,
 * -, @, a tab or a carriage return) starts with an apostrophe, so a name
 * someone typed can't
 * ([OWASP](https://owasp.org/www-community/attacks/CSV_Injection)).
 */
function csvField(value: DownloadValue): string {
  const raw = value === null ? "" : String(value);
  const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Rows as CSV (RFC 4180): a heading row, then a line each, CRLF between. */
export function toCsv<Row>(all: DownloadColumn<Row>[], rows: Row[]): string {
  const columns = downloaded(all);
  const lines = [
    columns.map((c) => csvField(c.label)),
    ...rows.map((row) => columns.map((c) => csvField(c.text(row)))),
  ];
  return lines.map((fields) => fields.join(",")).join("\r\n") + "\r\n";
}

/** Rows as a JSON array, each an object of its columns' values by key. */
export function toJson<Row>(all: DownloadColumn<Row>[], rows: Row[]): string {
  const columns = downloaded(all);
  return JSON.stringify(
    rows.map((row) => Object.fromEntries(columns.map((c) => [c.key, c.text(row)]))),
    null,
    2,
  );
}

/** Words for a filename: lower case, each run of anything but letters and digits one underscore. */
function fileWords(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * A download's filename: what it is, then each filter in words, then when,
 * in UTC to the minute, all lower case with underscores.
 * "politicians_party_labour_2026_10_27_1430.csv".
 */
export function downloadName(what: string, filters: string[], at: Date, format: DownloadFormat): string {
  const iso = at.toISOString();
  const when = `${iso.slice(0, 4)}_${iso.slice(5, 7)}_${iso.slice(8, 10)}_${iso.slice(11, 13)}${iso.slice(14, 16)}`;
  return `${[what, ...filters].map(fileWords).filter(Boolean).join("_")}_${when}.${format}`;
}
