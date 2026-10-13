import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { constituencyForPostcode } from "./postcodes";

const POSTCODES = "https://api.postcodes.io/postcodes/:postcode";

describe("constituencyForPostcode", () => {
  it("finds the constituency", async () => {
    expect(await constituencyForPostcode("SW1A 1AA")).toEqual({ ok: true, constituency: "Cities of London and Westminster" });
  });

  it("says when the postcode doesn't exist", async () => {
    expect(await constituencyForPostcode("XX1 1XX")).toEqual({ ok: false, reason: "not_found" });
  });

  it("says when the postcode has no constituency", async () => {
    server.use(http.get(POSTCODES, () => HttpResponse.json({ result: { parliamentary_constituency: null } })));
    expect(await constituencyForPostcode("GY1 1AA")).toEqual({ ok: false, reason: "no_constituency" });
    server.use(http.get(POSTCODES, () => HttpResponse.json({})));
    expect(await constituencyForPostcode("GY1 1AA")).toEqual({ ok: false, reason: "no_constituency" });
  });

  it("fails on a server error or a network error", async () => {
    server.use(http.get(POSTCODES, () => new HttpResponse(null, { status: 500 })));
    expect(await constituencyForPostcode("SW1A 1AA")).toEqual({ ok: false, reason: "failed" });
    server.use(http.get(POSTCODES, () => HttpResponse.error()));
    expect(await constituencyForPostcode("SW1A 1AA")).toEqual({ ok: false, reason: "failed" });
  });
});
