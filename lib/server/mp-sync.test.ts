import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { MEMBERS_API } from "@/lib/parliament";
import { query } from "./db";
import { decideHeldSync, recentSyncs, syncMps } from "./mp-sync";

type Row = { parliament_id: number | null; name: string; email: string | null; sitting: boolean; is_test: boolean };
const politicians = () => query<Row>("SELECT parliament_id, name, email, sitting, is_test FROM politicians ORDER BY is_test, parliament_id");

beforeEach(() => vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("syncMps", () => {
  useTestDatabase();

  it("fills an empty table, adds the test MP, and records the sync", async () => {
    const result = await syncMps();

    expect(result.status).toBe("applied");
    expect(result.changes.added).toHaveLength(2);
    expect(await politicians()).toEqual([
      { parliament_id: 172, name: "Ms Diane Abbott", email: "mp172.office@parliament.uk", sitting: true, is_test: false },
      { parliament_id: 5257, name: "Rachel Blake", email: "mp5257.office@parliament.uk", sitting: true, is_test: false },
      { parliament_id: null, name: "Testy McTestface MP", email: "test-mp@example.org", sitting: true, is_test: true },
    ]);
    const [sync] = await recentSyncs();
    expect(sync).toMatchObject({ status: "applied", decidedBy: null });
    expect(sync.changes.added.map((mp) => mp.parliamentId)).toEqual([5257, 172]);
    expect(await query("SELECT actor, action FROM audit_log")).toEqual([{ actor: "sync", action: "apply MP sync" }]);
  });

  it("does nothing when nothing has changed, except keep the test MP's inbox up to date", async () => {
    await syncMps();
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect((await syncMps()).status).toBe("unchanged");
    expect(await recentSyncs()).toHaveLength(1);
    expect((await politicians()).find((p) => p.is_test)!.email).toBeNull();
  });

  it("applies a small change: an MP who left stays, no longer sitting", async () => {
    await syncMps();
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, () =>
        HttpResponse.json({
          items: [{ value: { id: 172, nameListAs: "Abbott, Ms Diane", nameDisplayAs: "Ms Diane Abbott", nameAddressAs: "Ms Abbott", gender: "F", latestParty: { name: "Labour" }, latestHouseMembership: { membershipFrom: "Hackney North and Stoke Newington" } } }],
          totalResults: 1,
        }),
      ),
    );
    const result = await syncMps();
    expect(result.status).toBe("applied");
    expect(result.changes.removed.map((mp) => mp.parliamentId)).toEqual([5257]);
    expect((await politicians()).find((p) => p.parliament_id === 5257)!.sitting).toBe(false);
  });

  it("holds a sync that changes many MPs, until someone applies it", async () => {
    for (let i = 1; i <= 25; i++) await addTestPolitician({ parliamentId: 10000 + i, name: `MP ${i}`, constituency: `Seat ${i}` });

    const result = await syncMps();

    expect(result.status).toBe("held");
    expect((await politicians()).filter((p) => p.sitting && !p.is_test)).toHaveLength(25);
    const [held] = await recentSyncs();
    expect(held.status).toBe("held");

    expect(await decideHeldSync(held.id, "apply", "jo@pauseai.uk")).toBe(true);
    expect((await politicians()).filter((p) => p.sitting && !p.is_test).map((p) => p.parliament_id)).toEqual([172, 5257]);
    expect((await recentSyncs())[0]).toMatchObject({ status: "applied", decidedBy: "jo@pauseai.uk" });
    expect(await decideHeldSync(held.id, "apply", "jo@pauseai.uk")).toBe(false);
  });

  it("discards a held sync without changing anyone", async () => {
    for (let i = 1; i <= 25; i++) await addTestPolitician({ parliamentId: 10000 + i, name: `MP ${i}`, constituency: `Seat ${i}` });
    await syncMps();
    const [held] = await recentSyncs();

    expect(await decideHeldSync(held.id, "discard", "jo@pauseai.uk")).toBe(true);

    expect((await politicians()).filter((p) => p.sitting && !p.is_test)).toHaveLength(25);
    expect((await recentSyncs())[0].status).toBe("discarded");
    expect((await query<{ action: string }>("SELECT action FROM audit_log ORDER BY id")).map((r) => r.action)).toEqual(["hold MP sync", "discard held MP sync"]);
  });

  it("waits and tries again when Parliament's API is busy", async () => {
    let calls = 0;
    server.use(
      http.get(`${MEMBERS_API}/Members/Search`, () =>
        ++calls === 1 ? new HttpResponse(null, { status: 429, headers: { "Retry-After": "0" } }) : undefined,
      ),
      http.get(`${MEMBERS_API}/Members/172/Contact`, () => (++calls === 3 ? new HttpResponse(null, { status: 503, headers: { "Retry-After": "0" } }) : undefined)),
    );
    expect((await syncMps()).status).toBe("applied");
    expect(calls).toBeGreaterThanOrEqual(4);
  });

  it("gives up after five busy answers, waiting longer each time without Retry-After", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    let calls = 0;
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => (calls++, new HttpResponse(null, { status: 429 }))));
    const sync = syncMps();
    const failed = expect(sync).rejects.toThrow("returned 429");
    await vi.runAllTimersAsync();
    await failed;
    vi.useRealTimers();
    expect(calls).toBe(5);
  });

  it("fails, changing nothing, if Parliament's API fails", async () => {
    server.use(http.get(`${MEMBERS_API}/Members/Search`, () => new HttpResponse(null, { status: 500 })));
    await expect(syncMps()).rejects.toThrow("returned 500");
    expect(await politicians()).toEqual([]);
  });
});
