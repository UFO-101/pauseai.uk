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

  it("gives the whole log, its details as logged, to admins who see supporters", async () => {
    await logChange("jo@pauseai.uk", "erase supporter", { id: 9 });
    const rows = await (
      await downloadAs(GET, "https://pauseai.uk/staff/audit-log/download?format=json", ["admin", "supporters"])
    ).json();
    expect(rows).toContainEqual(expect.objectContaining({ action: "erase supporter", json: '{"id":9}' }));
  });

  it("gives what the log's filters find, in the order chosen, named for them", async () => {
    await logChange("jo@pauseai.uk", "add note", { noteId: 1 });
    await logChange("sam@pauseai.uk", "add note", { noteId: 2 });
    await logChange("sam@pauseai.uk", "edit event", {});
    const response = await downloadAs(
      GET,
      "https://pauseai.uk/staff/audit-log/download?format=json&action=add+note&sort=actor&dir=asc",
      ["admin", "supporters"],
    );
    expect(response.headers.get("Content-Disposition")).toContain("what_add_note");
    const rows: { actor: string; action: string }[] = await response.json();
    expect(rows.map((row) => [row.actor, row.action])).toEqual([
      ["jo@pauseai.uk", "add note"],
      ["sam@pauseai.uk", "add note"],
    ]);
  });

  it("leaves out entries about supporters for an admin who doesn't", async () => {
    await logChange("jo@pauseai.uk", "erase supporter", { id: 9 });
    const rows = await (
      await downloadAs(GET, "https://pauseai.uk/staff/audit-log/download?format=json", ["admin"])
    ).json();
    expect(rows).not.toContainEqual(expect.objectContaining({ action: "erase supporter" }));
  });
});
