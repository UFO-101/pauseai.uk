import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadResponse } from "./staff-download";

vi.mock("server-only", () => ({}));

const columns = [{ key: "name", label: "Name", text: (row: { name: string }) => row.name }];

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

  it("gives JSON", async () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-27T14:30:00Z");
    const response = downloadResponse("json", "Politicians", [], columns, [{ name: "Ann" }]);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="politicians_2026_10_27_1430.json"');
    expect(await response.json()).toEqual([{ name: "Ann" }]);
  });
});
