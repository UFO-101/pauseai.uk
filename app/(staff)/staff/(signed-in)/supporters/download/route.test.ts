import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { query } from "@/lib/server/db";
import { linkSupporters } from "@/lib/server/supporters";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/supporters/download", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("gives every supporter the filters find, as cards too, with the numbers the Contact filter finds, each download logged", async () => {
    await query(
      `INSERT INTO members (id, email, name, phone, city, joined_at, created_at, keep_informed, share_permission, source_modified_at)
       VALUES ('recA', 'ann@example.com', 'Ann', '+447700900001', 'Leeds', '2026-09-01', '2026-09-01', true, true, '2026-09-01')`,
    );
    await linkSupporters();
    // A member's number, given with no intent, is a volunteer's.
    const found = "contact=email%3Apauseai-updates%3Aunsure&contact=phone%3Avolunteering%3Ayes";
    const csv = await downloadAs(GET, `https://pauseai.uk/staff/supporters/download?format=csv&${found}`, [
      "supporters",
    ]);
    expect(await csv.text()).toContain("Ann,ann@example.com,'+447700900001");
    const cards = await (
      await downloadAs(GET, `https://pauseai.uk/staff/supporters/download?format=vcf&${found}`, ["supporters"])
    ).text();
    expect(cards).toMatch(/^FN:PauseAI \w{4} - Ann$/m);
    expect(cards).toContain("TEL;TYPE=CELL,PREF:+447700900001");
    expect(
      await query(
        "SELECT details->>'format' AS format FROM audit_log WHERE action = 'download supporters' ORDER BY id",
      ),
    ).toEqual([{ format: "csv" }, { format: "vcf" }]);
  });
});
