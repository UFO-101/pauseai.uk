import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import readGmail, { config } from "./read-gmail";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the hourly Gmail reading function", () => {
  it("runs hourly from 06:20 to 23:20 UTC, and asks the site to read with the secret", async () => {
    expect(config.schedule).toBe("20 6-23 * * *");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/read-gmail", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ accounts: [] });
      }),
    );
    expect(await (await readGmail()).json()).toEqual({ accounts: [] });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/read-gmail", () => new HttpResponse("nope", { status: 401 })));
    await expect(readGmail()).rejects.toThrow("returned 401: nope");
  });
});
