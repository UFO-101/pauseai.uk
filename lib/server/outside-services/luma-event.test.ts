import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { LumaRateLimited } from "./luma-api";
import { getEventHosts } from "./luma-event";

const GET = "https://public-api.luma.com/v1/events/get";

describe("getEventHosts", () => {
  beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());

  it("asks for the event and gives its hosts, a name empty where Luma has none, skipping one without an ID or email", async () => {
    let asked: string | null = null;
    server.use(
      http.get(GET, ({ request }) => {
        asked = new URL(request.url).searchParams.get("event_id");
        return HttpResponse.json(
          {
            hosts: [
              { id: "usr-1", email: "jane.smith@example.com", name: "Jane Smith", first_name: "Jane" },
              { id: "usr-2", email: "john.smith@example.com", name: null },
              { id: "usr-3", email: null, name: "No Email" },
              { email: "no.id@example.com", name: "No ID" },
              null,
            ],
          },
          { headers: { "x-ratelimit-remaining": "120" } },
        );
      }),
    );
    expect(await getEventHosts("evt-1")).toEqual({
      entries: [
        { userId: "usr-1", email: "jane.smith@example.com", name: "Jane Smith" },
        { userId: "usr-2", email: "john.smith@example.com", name: "" },
      ],
      remaining: 120,
    });
    expect(asked).toBe("evt-1");
  });

  it("gives none when Luma lists none, and throws as Luma's other calls do", async () => {
    server.use(http.get(GET, () => HttpResponse.json({})));
    expect(await getEventHosts("evt-1")).toEqual({ entries: [], remaining: undefined });
    server.use(http.get(GET, () => new HttpResponse(null, { status: 429 })));
    await expect(getEventHosts("evt-1")).rejects.toBeInstanceOf(LumaRateLimited);
  });
});
