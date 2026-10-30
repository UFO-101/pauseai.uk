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
  it("runs hourly from 06:17 to 23:17 UTC, and starts the background import with the secret", async () => {
    expect(config.schedule).toBe("17 6-23 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/.netlify/functions/import-luma-background", ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const res = await importLuma();
    expect(res.status).toBe(200);
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the background import doesn't start", async () => {
    server.use(
      http.post(
        "https://pauseai.uk/.netlify/functions/import-luma-background",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    await expect(importLuma()).rejects.toThrow("import-luma-background returned 404");
  });
});
