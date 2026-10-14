import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { copy } from "@/lib/content/email-your-mp";
import { checkNotSpam } from "./turnstile";

const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0x4AAAAAAA-real-looking");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const check = (token?: string, hostname = "localhost") => checkNotSpam({ turnstileToken: token }, hostname);

describe("checkNotSpam", () => {
  it("drops a filled-in honeypot without asking Turnstile", async () => {
    server.use(http.post(VERIFY, () => HttpResponse.error()));
    expect(await checkNotSpam({ nickname: "bot", turnstileToken: "t" }, "localhost")).toEqual({ drop: true });
  });

  it("passes a token Turnstile accepts, sending it with the secret", async () => {
    let body = "";
    server.use(
      http.post(VERIFY, async ({ request }) => {
        body = await request.text();
        return HttpResponse.json({ success: true, hostname: "localhost" });
      }),
    );
    expect(await check("token-1")).toEqual({ drop: false });
    expect(new URLSearchParams(body).get("response")).toBe("token-1");
    expect(new URLSearchParams(body).get("secret")).toBe("0x4AAAAAAA-real-looking");
  });

  it("passes when Turnstile doesn't name a host", async () => {
    server.use(http.post(VERIFY, () => HttpResponse.json({ success: true })));
    expect(await check("t")).toEqual({ drop: false });
  });

  it("refuses a token from another host", async () => {
    expect(await check("t", "pauseai.uk")).toEqual({ drop: false, message: copy.errors.spamFailed });
  });

  it("refuses a token Turnstile rejects", async () => {
    server.use(http.post(VERIFY, () => HttpResponse.json({ success: false, "error-codes": ["invalid-input-response"] })));
    expect(await check("t")).toEqual({ drop: false, message: copy.errors.spamFailed });
  });

  it("asks the sender to wait when there's no token yet", async () => {
    expect(await check(undefined)).toEqual({ drop: false, message: copy.errors.spamWait });
  });

  it("fails when Turnstile can't be reached", async () => {
    server.use(http.post(VERIFY, () => HttpResponse.error()));
    expect(await check("t")).toEqual({ drop: false, message: copy.errors.spamUnreachable });
  });

  it("is skipped when neither key is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(await check(undefined, "pauseai.uk")).toEqual({ drop: false });
    expect(console.warn).toHaveBeenCalledWith("Turnstile keys are not set, so the spam check was skipped");
  });

  it("fails closed with a site key but no secret, or with a test secret", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAAAAAA-site");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await check("t")).toEqual({ drop: false, message: copy.errors.spamUnavailable });
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(await check("t")).toEqual({ drop: false, message: copy.errors.spamMisconfigured });
  });

  it("in development, allows no secret, a test secret, and any host", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await check(undefined)).toEqual({ drop: false });
    expect(console.warn).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    expect(await check(undefined)).toEqual({ drop: false });
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(await check("t", "pauseai.uk")).toEqual({ drop: false });
  });
});
