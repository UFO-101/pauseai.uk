import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import deleteUnconfirmedLetters, { config } from "./delete-unconfirmed-letters";

beforeEach(() => {
  vi.stubEnv("URL", "https://pauseai.uk");
  vi.stubEnv("CRON_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("the daily clean-up of unconfirmed letters", () => {
  it("runs daily, and asks the site to delete them with the secret", async () => {
    expect(config.schedule).toBe("@daily");
    let auth: string | null = null;
    server.use(
      http.post("https://pauseai.uk/api/cron/delete-unconfirmed-letters", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ deleted: 0 });
      }),
    );
    expect(await (await deleteUnconfirmedLetters()).json()).toEqual({ deleted: 0 });
    expect(auth).toBe("Bearer s3cret");
  });

  it("fails loudly if the site does", async () => {
    server.use(http.post("https://pauseai.uk/api/cron/delete-unconfirmed-letters", () => new HttpResponse("nope", { status: 401 })));
    await expect(deleteUnconfirmedLetters()).rejects.toThrow("returned 401: nope");
  });
});
