import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import syncPoliticians, { config } from "./sync-politicians";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the daily politician sync function", () => {
  it("runs daily, just after the day's first imports, and asks the site to sync with the secret", async () => {
    expect(config.schedule).toBe("21 6 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/sync-politicians", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ status: "unchanged" });
      }),
    );
    expect(await (await syncPoliticians()).json()).toEqual({ status: "unchanged" });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(
      http.post("https://pauseai.uk/api/cron/sync-politicians", () => new HttpResponse("nope", { status: 401 })),
    );
    await expect(syncPoliticians()).rejects.toThrow("returned 401: nope");
  });
});
