import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import checkMps, { config } from "./check-mps";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the nightly MP check function", () => {
  it("runs daily, an hour after the sync, and asks the site to check with the secret", async () => {
    expect(config.schedule).toBe("0 1 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/check-mps", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ problems: 0 });
      }),
    );
    expect(await (await checkMps()).json()).toEqual({ problems: 0 });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/check-mps", () => new HttpResponse("nope", { status: 401 })));
    await expect(checkMps()).rejects.toThrow("returned 401: nope");
  });
});
