import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { query } from "@/lib/server/db";
import { addTestLetter, addTestPolitician } from "@/tests/database";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/letters/download", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("gives every letter the filters find, logged, with no cards", async () => {
    await addTestLetter({ politicianId: await addTestPolitician(), senderName: "Sam Sender" });
    const csv = await downloadAs(GET, "https://pauseai.uk/staff/letters/download?format=csv&q=sam", ["supporters"]);
    expect(await csv.text()).toContain("Sam Sender <sam@example.com>");
    expect(await query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'download letters'")).toEqual([
      { n: 1 },
    ]);
    expect((await downloadAs(GET, "https://pauseai.uk/staff/letters/download?format=vcf", ["supporters"])).status).toBe(
      404,
    );
  });
});
