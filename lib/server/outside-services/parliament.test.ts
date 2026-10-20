import { expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { MEMBERS_API } from "@/lib/parliament";
import { currentMps } from "./parliament";

it("waits and tries again when Parliament's API is busy", async () => {
  let calls = 0;
  server.use(
    http.get(`${MEMBERS_API}/Members/Search`, () =>
      ++calls === 1 ? new HttpResponse(null, { status: 429, headers: { "Retry-After": "0" } }) : undefined,
    ),
    http.get(`${MEMBERS_API}/Members/90001/Contact`, () =>
      ++calls === 3 ? new HttpResponse(null, { status: 503, headers: { "Retry-After": "0" } }) : undefined,
    ),
  );
  expect((await currentMps()).length).toBeGreaterThan(0);
  expect(calls).toBeGreaterThanOrEqual(4);
});

it("gives up after five busy answers, waiting longer each time without Retry-After", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  let calls = 0;
  server.use(http.get(`${MEMBERS_API}/Members/Search`, () => (calls++, new HttpResponse(null, { status: 429 }))));
  const failed = expect(currentMps()).rejects.toThrow("returned 429");
  await vi.runAllTimersAsync();
  await failed;
  vi.useRealTimers();
  expect(calls).toBe(5);
});
