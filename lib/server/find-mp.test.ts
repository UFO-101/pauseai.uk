import { beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase, withDatabaseDown } from "@/tests/database";
import { findMp } from "./find-mp";

describeWithDatabase("findMp", () => {
  useTestDatabase();
  beforeEach(() => vi.restoreAllMocks());

  it("finds the MP for a postcode", async () => {
    const id = await addTestPolitician();
    expect(await findMp(" SW1A 1AA ")).toEqual({
      ok: true,
      mp: { id, name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: "rachel.blake.mp@parliament.uk", isTest: false },
    });
  });

  it("finds the test MP from ZZ99ZZ without asking postcodes.io", async () => {
    server.use(http.all("*", () => HttpResponse.error()));
    expect(await findMp("zz9 9zz")).toEqual({ ok: false, reason: "no_mp" });
    await addTestMp();
    expect(await findMp("zz9 9zz")).toMatchObject({ ok: true, mp: { name: "Testy McTestface MP", email: "test-mp@example.org" } });
  });

  it("passes on postcodes.io's failures, and says when no MP sits for the constituency", async () => {
    expect(await findMp("XX1 1XX")).toEqual({ ok: false, reason: "not_found" });
    expect(await findMp("SW1A 1AA")).toEqual({ ok: false, reason: "no_mp" });
  });

  it("fails if the database does", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await withDatabaseDown(() => findMp("SW1A 1AA"))).toEqual({ ok: false, reason: "failed" });
  });
});
