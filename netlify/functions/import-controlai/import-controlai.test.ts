import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importControlAi, { config } from "./import-controlai";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the nightly ControlAI import function", () => {
  it("runs daily, after the sync and the check, and asks the site to import with the secret", async () => {
    expect(config.schedule).toBe("0 2 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/import-controlai", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      }),
    );
    expect(await (await importControlAi()).json()).toEqual({ ok: true });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(
      http.post("https://pauseai.uk/api/cron/import-controlai", () => new HttpResponse("nope", { status: 500 })),
    );
    await expect(importControlAi()).rejects.toThrow("returned 500: nope");
  });
});
