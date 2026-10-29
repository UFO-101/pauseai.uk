import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import sendMailingsBackground from "./send-mailings-background";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const start = (authorization?: string) =>
  sendMailingsBackground(
    new Request("https://pauseai.uk/.netlify/functions/send-mailings-background", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

/** The site sending `each` per call until `left` is gone. Returns how many calls it took. */
function site(left: number, each: number) {
  const calls = { count: 0 };
  server.use(
    http.post("https://pauseai.uk/api/cron/send-mailings", ({ request }) => {
      expect(request.headers.get("authorization")).toBe("Bearer s3cret");
      calls.count++;
      const sent = Math.min(each, left);
      left -= sent;
      return HttpResponse.json({ sent, skipped: 0, failed: 0, left, waiting: [] });
    }),
  );
  return calls;
}

describe("the background sending function", () => {
  it("asks the site to send until there's nothing left", async () => {
    const calls = site(25, 10);
    await start("Bearer s3cret");
    expect(calls.count).toBe(3);
  });

  it("stops when a call sends nothing, as every account's at its limit", async () => {
    const calls = site(25, 0);
    await start("Bearer s3cret");
    expect(calls.count).toBe(1);
  });

  it("stops short of Netlify's 15 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const calls = site(1000, 1);
    server.use(
      http.post("https://pauseai.uk/api/cron/send-mailings", () => {
        calls.count++;
        vi.setSystemTime(Date.now() + 5 * 60_000);
        return HttpResponse.json({ sent: 1, skipped: 0, failed: 0, left: 900, waiting: [] });
      }),
    );
    await start("Bearer s3cret");
    expect(calls.count).toBe(3);
  });

  it("does nothing for a call without the secret, or with none set", async () => {
    const calls = site(5, 5);
    await start("Bearer guess");
    await start();
    vi.stubEnv("CRON_SECRET", "");
    await start("Bearer ");
    expect(calls.count).toBe(0);
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/send-mailings", () => new HttpResponse("nope", { status: 500 })));
    await expect(start("Bearer s3cret")).rejects.toThrow("returned 500: nope");
  });
});
