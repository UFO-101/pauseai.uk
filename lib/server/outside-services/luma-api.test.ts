import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { LumaRateLimited, lumaList } from "./luma-api";

const LIST = "https://public-api.luma.com/v1/things/list";

describe("lumaList", () => {
  beforeEach(() => vi.stubEnv("LUMA_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());

  it("fetches a page with the key and the params, and reads the cursor and the rate limit", async () => {
    let request: Request | undefined;
    server.use(
      http.get(LIST, ({ request: r }) => {
        request = r;
        return HttpResponse.json(
          { entries: [1, 2], has_more: true, next_cursor: "c2" },
          { headers: { "x-ratelimit-remaining": "150" } },
        );
      }),
    );
    const page = await lumaList<number>("/v1/things/list", new URLSearchParams({ a: "1" }));
    expect(page).toEqual({ entries: [1, 2], nextCursor: "c2", remaining: 150 });
    expect(request!.headers.get("x-luma-api-key")).toBe("k");
    expect(new URL(request!.url).searchParams.get("a")).toBe("1");
  });

  it("gives no cursor on the last page, or when has_more comes without one, and no rate limit without the header", async () => {
    server.use(http.get(LIST, () => HttpResponse.json({ has_more: true })));
    expect(await lumaList("/v1/things/list", new URLSearchParams())).toEqual({
      entries: [],
      nextCursor: undefined,
      remaining: undefined,
    });
    server.use(http.get(LIST, () => HttpResponse.json({ entries: [1], has_more: false, next_cursor: "stale" })));
    expect((await lumaList("/v1/things/list", new URLSearchParams())).nextCursor).toBeUndefined();
  });

  it("throws LumaRateLimited on a 429, with Luma's retry-after or a minute", async () => {
    server.use(http.get(LIST, () => new HttpResponse(null, { status: 429, headers: { "retry-after": "30" } })));
    await expect(lumaList("/v1/things/list", new URLSearchParams())).rejects.toMatchObject({ retryAfter: 30 });
    server.use(http.get(LIST, () => new HttpResponse(null, { status: 429 })));
    const error = await lumaList("/v1/things/list", new URLSearchParams()).catch((e) => e);
    expect(error).toBeInstanceOf(LumaRateLimited);
    expect(error.retryAfter).toBe(60);
  });

  it("throws on any other answer that isn't ok, and without the key, without calling Luma", async () => {
    server.use(http.get(LIST, () => new HttpResponse(null, { status: 401 })));
    await expect(lumaList("/v1/things/list", new URLSearchParams())).rejects.toThrow("Luma answered 401");
    vi.stubEnv("LUMA_API_KEY", "");
    let called = false;
    server.use(
      http.get(LIST, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    await expect(lumaList("/v1/things/list", new URLSearchParams())).rejects.toThrow("LUMA_API_KEY is not set");
    expect(called).toBe(false);
  });
});
