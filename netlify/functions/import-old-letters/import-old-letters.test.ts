import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importOldLetters, { config } from "./import-old-letters";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the import of old letters function", () => {
  it("runs every 5 minutes, off the Gmail reading, and starts the background import with the secret", async () => {
    expect(config.schedule).toBe("3-59/5 * * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/.netlify/functions/import-old-letters-background", ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const res = await importOldLetters();
    expect(res.status).toBe(200);
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the background import doesn't start", async () => {
    server.use(
      http.post(
        "https://pauseai.uk/.netlify/functions/import-old-letters-background",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    await expect(importOldLetters()).rejects.toThrow("import-old-letters-background returned 404");
  });
});
