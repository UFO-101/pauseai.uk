import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { getMarchSignupCount, marchEventId } from "./march-event";

afterEach(() => vi.unstubAllEnvs());

describe("marchEventId", () => {
  it("is the march's own event in production", () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    expect(marchEventId()).toBe("evt-1HKCXSHaJqGO3Bg");
  });

  it("is the test event on every other deploy", () => {
    vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
    expect(marchEventId()).toBe("evt-hfOj1RR5K1gBNEW");
  });
});

describe("getMarchSignupCount", () => {
  it.each(["production", "deploy-preview"])("counts the march's own event's guests on %s", async (context) => {
    vi.stubEnv("LUMA_API_KEY", "k");
    vi.stubEnv("DEPLOY_CONTEXT", context);
    let asked: string | null = null;
    server.use(
      http.get("https://public-api.luma.com/v1/events/get", ({ request }) => {
        asked = new URL(request.url).searchParams.get("event_id");
        return HttpResponse.json({ guest_counts: { approved: { guests: 42, tickets: 42 } } });
      }),
    );
    expect(await getMarchSignupCount()).toBe(42);
    expect(asked).toBe("evt-1HKCXSHaJqGO3Bg");
  });
});
