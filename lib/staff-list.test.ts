import { describe, expect, it } from "vitest";
import { downloadFormat, downloadName, pageRange, toCsv, toJson, type DownloadColumn } from "./staff-list";

describe("downloadFormat", () => {
  it("knows CSV and JSON, and nothing else", () => {
    expect(downloadFormat("csv")).toBe("csv");
    expect(downloadFormat("json")).toBe("json");
    expect(downloadFormat("xml")).toBeUndefined();
    expect(downloadFormat(null)).toBeUndefined();
  });
});

describe("pageRange", () => {
  it("shows every page of a few", () => {
    expect(pageRange(1, 1)).toEqual([1]);
    expect(pageRange(2, 3)).toEqual([1, 2, 3]);
    expect(pageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("leaves out pages far from this one, with a gap", () => {
    expect(pageRange(6, 50)).toEqual([1, "gap", 4, 5, 6, 7, 8, "gap", 50]);
    expect(pageRange(1, 50)).toEqual([1, 2, 3, "gap", 50]);
    expect(pageRange(50, 50)).toEqual([1, "gap", 48, 49, 50]);
  });

  it("shows a page rather than a gap standing for it alone", () => {
    expect(pageRange(5, 50)).toEqual([1, 2, 3, 4, 5, 6, 7, "gap", 50]);
    expect(pageRange(46, 50)).toEqual([1, "gap", 44, 45, 46, 47, 48, 49, 50]);
  });
});

type Row = { name: string; count: number; ok: boolean; note: string | null };
const columns: DownloadColumn<Row>[] = [
  { key: "name", label: "Name", text: (r) => r.name },
  { key: "count", label: "Letters, sent", text: (r) => r.count },
  { key: "ok", label: "OK", text: (r) => r.ok },
  { key: "note", label: "Note", text: (r) => r.note },
  { key: "button", label: "" },
];

describe("toCsv", () => {
  it("writes a heading row and a row each, quoting what needs it", () => {
    const rows: Row[] = [
      { name: "Ann", count: 2, ok: true, note: null },
      { name: 'Bob "B", Jr', count: 0, ok: false, note: "two\nlines" },
    ];
    expect(toCsv(columns, rows)).toBe(
      'Name,"Letters, sent",OK,Note\r\nAnn,2,true,\r\n"Bob ""B"", Jr",0,false,"two\nlines"\r\n',
    );
  });

  it("stops text a spreadsheet would run as a formula, but not numbers", () => {
    const rows: Row[] = [
      { name: "=1+1", count: -1, ok: true, note: "+447700900001" },
      { name: "@sum", count: 1, ok: true, note: "-x" },
    ];
    expect(toCsv(columns, rows)).toBe(
      "Name,\"Letters, sent\",OK,Note\r\n'=1+1,-1,true,'+447700900001\r\n'@sum,1,true,'-x\r\n",
    );
  });
});

describe("toJson", () => {
  it("gives each row its values by key", () => {
    expect(JSON.parse(toJson(columns, [{ name: "Ann", count: 2, ok: true, note: null }]))).toEqual([
      { name: "Ann", count: 2, ok: true, note: null },
    ]);
  });
});

describe("downloadName", () => {
  const at = new Date("2026-10-27T14:30:59Z");

  it("says what, each filter and when, in lower case with underscores", () => {
    expect(downloadName("Politicians", ["House of Commons", "Party: Labour (Co-op)"], at, "csv")).toBe(
      "politicians_house_of_commons_party_labour_co_op_2026_10_27_1430.csv",
    );
  });

  it("drops accents and filters that are only punctuation", () => {
    expect(downloadName("Supporters", ["Siân", "—"], at, "json")).toBe("supporters_sian_2026_10_27_1430.json");
  });
});
