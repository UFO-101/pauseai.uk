import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { downloadResponse, staffDownload, type Download } from "./staff-download";

vi.mock("next/headers", () => import("@/tests/next-headers"));

type Row = { name: string };
const columns = [{ key: "name", label: "Name", text: (row: Row) => row.name }];

describe("downloadResponse", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("gives CSV with a byte-order mark, named for what, its filters and when", async () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-27T14:30:00Z");
    const response = downloadResponse("csv", "Politicians", ["Party Labour"], columns, [{ name: "Siân" }]);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="politicians_party_labour_2026_10_27_1430.csv"',
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await response.clone().arrayBuffer()).slice(0, 3)).toEqual(
      new Uint8Array([0xef, 0xbb, 0xbf]),
    );
    expect(await response.text()).toContain("Name\r\nSiân\r\n");
  });

  it("gives JSON, and cards made already", async () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-27T14:30:00Z");
    const json = downloadResponse("json", "Politicians", [], columns, [{ name: "Ann" }]);
    expect(json.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(json.headers.get("Content-Disposition")).toBe('attachment; filename="politicians_2026_10_27_1430.json"');
    expect(await json.json()).toEqual([{ name: "Ann" }]);
    const vcf = downloadResponse("vcf", "Politicians", ["AB3D"], columns, [], "BEGIN:VCARD");
    expect(vcf.headers.get("Content-Type")).toBe("text/vcard; charset=utf-8");
    expect(vcf.headers.get("Content-Disposition")).toBe('attachment; filename="politicians_ab3d_2026_10_27_1430.vcf"');
    expect(await vcf.text()).toBe("BEGIN:VCARD");
  });
});

describeWithDatabase("staffDownload", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  const load =
    (contact?: Download<Row>["contact"]) =>
    async (params: Record<string, string>): Promise<Download<Row>> => ({
      what: "People",
      filters: params.q ? [`Search ${params.q}`] : [],
      columns,
      rows: [{ name: "Ann" }],
      contact,
    });
  const route = (contact?: Download<Row>["contact"], log?: string) => (request: Parameters<typeof staffDownload>[0]) =>
    staffDownload(request, "jo@pauseai.uk", load(contact), log);

  it("gives the rows the filters find, in the format asked for, and logs it when asked", async () => {
    const res = await downloadAs(route(undefined, "download people"), "https://pauseai.uk/x?format=csv&q=ann");
    expect(await res.text()).toContain("Name\r\nAnn\r\n");
    expect(await query("SELECT actor, action, details FROM audit_log WHERE action = 'download people'")).toEqual([
      {
        actor: "jo@pauseai.uk",
        action: "download people",
        details: { filters: ["Search ann"], format: "csv", rows: 1 },
      },
    ]);
  });

  it("gives vCards with a code of their own, in each name, the filename and the log", async () => {
    const res = await downloadAs(
      route((row) => ({ name: row.name, emails: [], phones: [], url: "/p/1" }), "download people"),
      "https://pauseai.uk/x?format=vcf",
    );
    const cards = await res.text();
    const code = cards.match(/^FN:PauseAI (\w{4}) - Ann$/m)![1];
    expect(cards).toContain("URL:https://pauseai.uk/p/1");
    expect(res.headers.get("Content-Disposition")).toContain(`people_${code.toLowerCase()}_`);
    const [{ details }] = await query<{ details: { code: string } }>(
      "SELECT details FROM audit_log WHERE action = 'download people'",
    );
    expect(details.code).toBe(code);
  });

  it("is a 404 for a format it doesn't know, and for vCards of a list that isn't of people", async () => {
    expect((await downloadAs(route(), "https://pauseai.uk/x?format=xml")).status).toBe(404);
    expect((await downloadAs(route(), "https://pauseai.uk/x")).status).toBe(404);
    expect((await downloadAs(route(), "https://pauseai.uk/x?format=vcf")).status).toBe(404);
    expect(await query("SELECT * FROM audit_log WHERE action LIKE 'download%'")).toEqual([]);
  });
});
