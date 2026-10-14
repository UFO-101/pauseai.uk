import { expect, it, vi } from "vitest";
import { setStatus } from "@/lib/server/politicians";
import { addTestPolitician, describeWithDatabase, useTestDatabase, withDatabaseDown } from "@/tests/database";
import { GET } from "./route";

describeWithDatabase("GET /api/signatories", () => {
  useTestDatabase();

  it("returns who signed the letter to the Prime Minister, with a cache header", async () => {
    const id = await addTestPolitician();
    await setStatus(id, "regulate-letter-pm", { status: "signed", date: null, note: "" }, "jo@pauseai.uk");

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=3600, stale-while-revalidate=86400");
    expect(await res.json()).toEqual([{ name: "Polly Placeholder", party: "Labour (Co-op)", constituency: "Cities of London and Westminster", house: "commons" }]);
  });

  it("returns 500 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await withDatabaseDown(GET)).status).toBe(500);
    vi.restoreAllMocks();
  });
});
