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
import { syncPoliticians } from "./politician-sync";

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("checkMps", () => {
  useTestDatabase();

  it("keeps each MP's own domains, by their constituency, and forgets one no longer listed", async () => {
    await syncPoliticians(NIGHTLY);
    await query(
      `INSERT INTO politician_domains (domain, notable_person_id) SELECT 'old.example', id FROM notable_people LIMIT 1`,
    );
    server.use(
      http.get(`${MEMBERS_API}/Members/90002/Contact`, () =>
        HttpResponse.json({ value: [{ isWebAddress: true, line1: "https://www.polly.example" }, { email: "a@parliament.uk" }] }),
      ),
      http.get(`${MEMBERS_API}/Members/90001/Contact`, () =>
        HttpResponse.json({ value: [{ email: "someone@notours.example" }] }),
      ),
    );
    await query("UPDATE politicians SET constituency = 'Elsewhere' WHERE constituency = 'Hackney North and Stoke Newington'");
    await checkMps("jo@pauseai.uk");
    const rows = await query<{ domain: string; name: string }>(
      `SELECT d.domain, n.name FROM politician_domains d JOIN notable_people n ON n.id = d.notable_person_id`,
    );
    expect(rows).toEqual([{ domain: "polly.example", name: "Polly Placeholder" }]);
  });

  it("compares the MPs copied from Airtable with Parliament's, and keeps what it finds", async () => {
    await syncPoliticians(NIGHTLY);
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
