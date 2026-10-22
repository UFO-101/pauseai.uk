import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importLuma, { config } from "./import-luma";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the hourly Luma import function", () => {
  it("runs hourly, off the hour, and asks the site to import with the secret", async () => {
    expect(config.schedule).toBe("17 * * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/import-luma", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ events: 1 });
      }),
    );
    expect(await (await importLuma()).json()).toEqual({ events: 1 });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/import-luma", () => new HttpResponse("nope", { status: 500 })));
    await expect(importLuma()).rejects.toThrow("returned 500: nope");
  });
});
