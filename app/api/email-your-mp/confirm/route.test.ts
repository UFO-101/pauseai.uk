import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { submitLetter } from "@/lib/server/mp-letters";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

const confirm = (body: string) => POST(new Request("https://pauseai.uk/api/email-your-mp/confirm", { method: "POST", body }));

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describeWithDatabase("POST /api/email-your-mp/confirm", () => {
  useTestDatabase();

  async function token() {
    await addTestMp();
    let body = "";
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        body = ((await request.json()) as { TextBody: string }).TextBody;
        return HttpResponse.json({ ErrorCode: 0, MessageID: "m" });
      }),
    );
    await submitLetter(
      { campaign: "regulate-letter-pm", name: "Jane", postcode: "ZZ99ZZ", address: "1 High St", email: "jane@example.com", subject: "S", letter: "L", consent: false, nickname: "", turnstileToken: "t" },
      "https://pauseai.uk",
      "localhost",
    );
    return body.match(/confirm#([\w-]+)/)![1];
  }

  it("sends the letter and says so", async () => {
    const res = await confirm(JSON.stringify({ token: await token() }));
    expect(await res.json()).toEqual({ ok: true, message: copy.confirm.sent("Testy McTestface MP") });
  });

  it("says when the link has been used or is wrong", async () => {
    for (const body of [JSON.stringify({ token: "nope" }), JSON.stringify({ token: 5 }), "not json"]) {
      const res = await confirm(body);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, message: copy.confirm.invalid });
    }
  });

  it("says when sending failed", async () => {
    const t = await token();
    server.use(http.post("https://api.postmarkapp.com/email", () => new HttpResponse(null, { status: 500 })));
    const res = await confirm(JSON.stringify({ token: t }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, message: copy.confirm.failed });
  });
});
