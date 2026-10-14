import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { copy } from "@/lib/content/email-your-mp";
import { addTestMp, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

function send(body: string, origin = "http://localhost:3000") {
  return POST(new Request(`${origin}/api/email-your-mp/letters`, { method: "POST", body }));
}

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("POST /api/email-your-mp/letters", () => {
  useTestDatabase();

  it("accepts a letter, checking Turnstile against this site's host", async () => {
    await addTestMp();
    const letter = JSON.stringify({ campaign: "regulate-letter-pm", name: "Jane", postcode: "ZZ99ZZ", address: "1 High St", email: "jane@example.com", subject: "S", letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "L" }] }] }, turnstileToken: "t" });
    expect(await (await send(letter)).json()).toEqual({ ok: true });
    // The Turnstile fixture issues tokens for localhost, not pauseai.uk.
    expect(await (await send(letter, "https://pauseai.uk")).json()).toEqual({ ok: false, message: copy.errors.spamFailed });
  });

  it("accepts a bot's letter without saying so", async () => {
    expect(await (await send(JSON.stringify({ nickname: "bot" }))).json()).toEqual({ ok: true });
  });

  it("returns the reason and status when it refuses", async () => {
    const res = await send("not json");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, message: copy.errors.spamWait });
  });
});
