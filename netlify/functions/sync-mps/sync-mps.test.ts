import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import syncMps, { config } from "./sync-mps";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the nightly MP sync function", () => {
  it("runs daily, and asks the site to sync with the secret", async () => {
    expect(config.schedule).toBe("@daily");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/sync-mps", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ status: "unchanged" });
      }),
    );
    expect(await (await syncMps()).json()).toEqual({ status: "unchanged" });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/sync-mps", () => new HttpResponse("nope", { status: 401 })));
    await expect(syncMps()).rejects.toThrow("returned 401: nope");
  });
});
