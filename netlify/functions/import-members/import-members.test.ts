import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importMembers, { config } from "./import-members";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the hourly members import function", () => {
  it("runs hourly, just after the Luma import, and asks the site to import with the secret", async () => {
    expect(config.schedule).toBe("19 6-23 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/import-members", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ members: 1 });
      }),
    );
    expect(await (await importMembers()).json()).toEqual({ members: 1 });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(
      http.post("https://pauseai.uk/api/cron/import-members", () => new HttpResponse("nope", { status: 500 })),
    );
    await expect(importMembers()).rejects.toThrow("returned 500: nope");
  });
});
