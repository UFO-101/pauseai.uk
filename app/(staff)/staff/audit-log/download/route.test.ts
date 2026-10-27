import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { logChange } from "@/lib/server/audit";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/audit-log/download", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("gives the whole log, its details as logged, to admins", async () => {
    await logChange("jo@pauseai.uk", "erase supporter", { id: 9 });
    const rows = await (
      await downloadAs(GET, "https://pauseai.uk/staff/audit-log/download?format=json", ["admin"])
    ).json();
    expect(rows).toContainEqual(expect.objectContaining({ action: "erase supporter", json: '{"id":9}' }));
  });
});
