import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { MEMBERS_API } from "@/lib/parliament";
import { query } from "./db";
import { type MpCheck, NIGHTLY } from "@/lib/import-runs";
import { listRuns } from "./import-runs";
import { checkMps } from "./mp-check";

const recentChecks = () => listRuns("check-mps") as Promise<MpCheck[]>;
import { syncMps } from "./mp-sync";

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("checkMps", () => {
  useTestDatabase();

  it("compares the MPs copied from Airtable with Parliament's, and keeps what it finds", async () => {
    await syncMps(NIGHTLY);
    expect(await recentChecks()).toEqual([]);

    // The fixture Airtable gives Polly Placeholder an email Parliament doesn't list.
    const problems = await checkMps("jo@pauseai.uk");

    const blake = {
      kind: "email",
      constituency: "Cities of London and Westminster",
      name: "Polly Placeholder",
      airtable: "polly.placeholder.mp@parliament.uk",
      parliament: ["mp90002.office@parliament.uk"],
    };
    expect(problems).toEqual([blake]);
    expect(await recentChecks()).toMatchObject([
      { status: "ok", startedBy: "jo@pauseai.uk", result: { problems: [blake] } },
    ]);
  });

  it("lists the newest checks first", async () => {
    await query(
      `INSERT INTO import_runs (at, job, status, result) VALUES
       (now() - interval '1 day', 'check-mps', 'ok', '{"problems":[{"kind":"old"}]}'), (now(), 'check-mps', 'ok', '{"problems":[]}')`,
    );
    expect((await recentChecks()).map((run) => run.result.problems)).toEqual([[], [{ kind: "old" }]]);
  });

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
    await checkMps(NIGHTLY);
    expect(calls).toBeGreaterThanOrEqual(4);
  });

  it("gives up after five busy answers, waiting longer each time without Retry-After", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    let calls = 0;
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => (calls++, new HttpResponse(null, { status: 429 }))));
    const check = checkMps(NIGHTLY);
    const failed = expect(check).rejects.toThrow("returned 429");
    await vi.runAllTimersAsync();
    await failed;
    vi.useRealTimers();
    expect(calls).toBe(5);
  });

  it("fails, keeping the failure, if Parliament's API fails", async () => {
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => new HttpResponse(null, { status: 500 })));
    await expect(checkMps(NIGHTLY)).rejects.toThrow("returned 500");
    expect(await recentChecks()).toMatchObject([
      {
        status: "failed",
        startedBy: NIGHTLY,
        error: expect.stringMatching(/^https:\/\/.*\/Members\/Search\?.* returned 500$/),
      },
    ]);
  });
});
