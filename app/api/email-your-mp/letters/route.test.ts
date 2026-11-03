import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { copy } from "@/lib/content/email-your-mp";
import { addTestMp, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { LETTERS_INBOX } from "@/tests/gmail-sends";
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

  it("accepts a letter, whatever host Turnstile issued the token for, saying if it's queued", async () => {
    await addTestMp();
    const letter = JSON.stringify({
      campaign: "regulate-letter-pm",
      name: "Jane",
      postcode: "ZZ99ZZ",
      address: "1 High St",
      email: "jane@example.com",
      subject: "S",
      letter: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "L" }] }] },
      turnstileToken: "t",
    });
    // The Turnstile fixture issues tokens for localhost. On Netlify, the
    // request's URL is the site's netlify.app address, not pauseai.uk.
    // The letters inbox isn't connected yet, so it waits.
    expect(await (await send(letter, "https://main--pauseaiuk.netlify.app")).json()).toEqual({
      ok: true,
      queued: "not_connected",
    });
    await connectTestGmail(LETTERS_INBOX);
    expect(await (await send(letter)).json()).toEqual({ ok: true });
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
