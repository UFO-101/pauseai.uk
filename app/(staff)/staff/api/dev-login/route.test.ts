import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "@/lib/server/db";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk"));
afterEach(() => vi.unstubAllEnvs());

function post(body: BodyInit | null) {
  return POST(new NextRequest("https://pauseai.uk/staff/api/dev-login", { method: "POST", body }));
}

const form = (email: string) => {
  const data = new FormData();
  data.set("email", email);
  return data;
};

describeWithDatabase("POST /staff/api/dev-login", () => {
  useTestDatabase();

  it("in a fixture build, starts a session for the address and goes to the staff home", async () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    const res = await post(form(" Jo@PauseAI.uk "));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff");
    expect(res.headers.getSetCookie().some((c) => c.startsWith("staff_session="))).toBe(true);
    expect(await query("SELECT email FROM staff_sessions")).toEqual([{ email: "jo@pauseai.uk" }]);
  });

  it("refuses an address outside pauseai.uk, a missing one, and a body that isn't a form", async () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect((await post(form("jo@example.com"))).status).toBe(400);
    expect((await post(new FormData())).status).toBe(400);
    expect((await post("not a form")).status).toBe(400);
    expect(await query("SELECT email FROM staff_sessions")).toEqual([]);
  });

  it("doesn't exist outside a fixture build", async () => {
    vi.stubEnv("DATA_FIXTURES", "");
    expect((await post(form("jo@pauseai.uk"))).status).toBe(404);
    expect(await query("SELECT email FROM staff_sessions")).toEqual([]);
  });
});
