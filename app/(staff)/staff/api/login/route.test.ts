import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

function post(body: BodyInit | null) {
  return POST(new Request("https://pauseai.uk/staff/api/login", { method: "POST", body }));
}

describeWithDatabase("POST /staff/api/login", () => {
  useTestDatabase();

  it("emails a link to a pauseai.uk address, and says the same whatever was typed", async () => {
    const to: string[] = [];
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        to.push(((await request.json()) as { To: string }).To);
        return HttpResponse.json({ ErrorCode: 0, MessageID: "m" });
      }),
    );
    const form = (email: string) => {
      const data = new FormData();
      data.set("email", email);
      return data;
    };

    for (const res of [await post(form("jo@pauseai.uk")), await post(form("jo@gmail.com")), await post(null)]) {
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?sent=1");
    }
    expect(to).toEqual(["jo@pauseai.uk"]);
  });
});
