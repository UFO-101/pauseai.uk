import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import readGmail, { config } from "./read-gmail";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the Gmail reading function", () => {
  it("runs every 5 minutes, night and day, and asks the site to read with the secret", async () => {
    expect(config.schedule).toBe("*/5 * * * *");
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
