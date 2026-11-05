import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importOldLettersBackground from "./import-old-letters-background";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const start = (authorization?: string) =>
  importOldLettersBackground(
    new Request("https://pauseai.uk/.netlify/functions/import-old-letters-background", {
      method: "POST",
      headers: authorization ? { authorization } : {},
      body: JSON.stringify({ startedBy: "jo@pauseai.uk", dryRun: true }),
    }),
  );

/** The site, doing a press in `more` calls, each noting what it was asked. */
function site(more: number) {
  const calls: unknown[] = [];
  server.use(
    http.post("https://pauseai.uk/api/cron/import-old-letters", async ({ request }) => {
      calls.push(await request.json());
      return HttpResponse.json({ runId: 7, more: calls.length < more });
    }),
  );
  return calls;
}

describe("the background import of old letters", () => {
  it("asks the site again until it says it's done, keeping its run", async () => {
    const calls = site(2);
    await start("Bearer s3cret");
    expect(calls).toEqual([
      { startedBy: "jo@pauseai.uk", dryRun: true },
      { startedBy: "jo@pauseai.uk", dryRun: true, runId: 7 },
    ]);
  });

  it("does nothing for a call without the secret, or with none set", async () => {
    const calls = site(1);
    await start();
    vi.stubEnv("CRON_SECRET", "");
    await start("Bearer ");
    expect(calls).toEqual([]);
  });

  it("stops once its time is up", async () => {
    const calls = site(99);
    const at = vi.spyOn(Date, "now");
    at.mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(15 * 60_000);
    await start("Bearer s3cret");
    at.mockRestore();
    expect(calls).toHaveLength(1);
  });

  it("fails when the site does", async () => {
    server.use(
      http.post("https://pauseai.uk/api/cron/import-old-letters", () => new HttpResponse("no", { status: 500 })),
    );
    await expect(start("Bearer s3cret")).rejects.toThrow("returned 500: no");
  });
});
