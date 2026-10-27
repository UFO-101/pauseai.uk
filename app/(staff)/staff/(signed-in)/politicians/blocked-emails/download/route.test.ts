import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { downloadAs } from "@/tests/staff-download";
import { recordProblem } from "@/lib/server/email";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/politicians/blocked-emails/download", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("gives the blocked addresses the filters find", async () => {
    await recordProblem({
      address: "gone@example.org",
      messageId: null,
      kind: "hard",
      reason: "No such mailbox",
      canReset: true,
    });
    const res = await downloadAs(
      GET,
      "https://pauseai.uk/staff/politicians/blocked-emails/download?format=json&kind=hard",
      [],
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/_bounced_/);
  });
});
