import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import tidyLogs, { config } from "./tidy-logs";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the daily log tidying function", () => {
  it("runs daily, after the other jobs, and asks the site to tidy with the secret", async () => {
    expect(config.schedule).toBe("27 6 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/tidy-logs", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ importRuns: 0, auditEntries: 0 });
      }),
    );
    expect(await (await tidyLogs()).json()).toEqual({ importRuns: 0, auditEntries: 0 });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/tidy-logs", () => new HttpResponse("nope", { status: 401 })));
    await expect(tidyLogs()).rejects.toThrow("returned 401: nope");
  });
});
