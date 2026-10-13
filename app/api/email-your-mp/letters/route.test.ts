import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/lib/content/email-your-mp";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

function send(body: string) {
  return POST(new Request("http://localhost/api/email-your-mp/letters", { method: "POST", body }));
}

describe("POST /api/email-your-mp/letters", () => {
  it("accepts a bot's letter without saying so", async () => {
    const res = await send(JSON.stringify({ nickname: "bot" }));
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns the reason and status when it refuses", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0xreal");
    const res = await send("not json");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, message: copy.errors.spamWait });
  });
});
