import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { findMp } from "./find-mp";

afterEach(() => vi.unstubAllEnvs());

describe("findMp", () => {
  it("finds the MP for a postcode", async () => {
    expect(await findMp(" SW1A 1AA ")).toMatchObject({ ok: true, mp: { name: "Rachel Blake" } });
  });

  it("finds the test MP from ZZ99ZZ without asking postcodes.io", async () => {
    vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org");
    server.use(http.all("*", () => HttpResponse.error()));
    expect(await findMp("zz9 9zz")).toMatchObject({ ok: true, mp: { name: "Testy McTestface MP", email: "test-mp@example.org" } });
  });

  it("passes on postcodes.io's failures", async () => {
    expect(await findMp("XX1 1XX")).toEqual({ ok: false, reason: "not_found" });
  });

  it("says when no MP is listed for the constituency", async () => {
    server.use(http.get("https://api.postcodes.io/postcodes/:postcode", () => HttpResponse.json({ result: { parliamentary_constituency: "Atlantis" } })));
    expect(await findMp("SW1A 1AA")).toEqual({ ok: false, reason: "no_mp" });
  });
});
