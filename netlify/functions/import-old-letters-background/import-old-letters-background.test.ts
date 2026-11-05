import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import importOldLettersBackground from "./import-old-letters-background";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

const start = (authorization?: string) =>
  importOldLettersBackground(
    new Request("https://pauseai.uk/.netlify/functions/import-old-letters-background", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

/** The site's import, counting its calls and the secret each brought. */
function site() {
  const calls: (string | null)[] = [];
  server.use(
    http.post("https://pauseai.uk/api/cron/import-old-letters", ({ request }) => {
      calls.push(request.headers.get("authorization"));
      return HttpResponse.json({ finished: false });
    }),
  );
  return calls;
}

describe("the background import of old letters", () => {
  it("asks the site for a run, with the secret", async () => {
    const calls = site();
    await start("Bearer s3cret");
    expect(calls).toEqual(["Bearer s3cret"]);
  });

  it("does nothing for a call without the secret, or with none set", async () => {
    const calls = site();
    await start();
    vi.stubEnv("CRON_SECRET", "");
    await start("Bearer ");
    expect(calls).toEqual([]);
  });

  it("fails when the site does", async () => {
    server.use(
      http.post("https://pauseai.uk/api/cron/import-old-letters", () => new HttpResponse("no", { status: 500 })),
    );
    await expect(start("Bearer s3cret")).rejects.toThrow("returned 500: no");
  });
});
