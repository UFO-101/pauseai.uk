import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { constituencyForPostcode, placeForPostcode } from "./postcodes";

const POSTCODES = "https://api.postcodes.io/postcodes/:postcode";
const OUTCODES = "https://api.postcodes.io/outcodes/:outcode";

describe("constituencyForPostcode", () => {
  it("finds the constituency, and where the postcode is", async () => {
    expect(await constituencyForPostcode("SW1A 1AA")).toEqual({
      ok: true,
      constituency: "Cities of London and Westminster",
      place: { latitude: 51.501009, longitude: -0.141588 },
    });
  });

  it("leaves out where the postcode is if postcodes.io doesn't say", async () => {
    for (const where of [{}, { latitude: null, longitude: null }, { latitude: 51.5 }]) {
      server.use(
        http.get(POSTCODES, () => HttpResponse.json({ result: { parliamentary_constituency: "Somewhere", ...where } })),
      );
      expect(await constituencyForPostcode("AB1 2CD")).toEqual({ ok: true, constituency: "Somewhere" });
    }
  });

  it("names the constituency as the official list does, from its code", async () => {
    server.use(
      http.get(POSTCODES, () =>
        HttpResponse.json({
          result: {
            parliamentary_constituency: "Montgomeryshire and Glyndwr",
            codes: { parliamentary_constituency: "W07000102" },
          },
        }),
      ),
    );
    expect(await constituencyForPostcode("SY21 7JP")).toEqual({
      ok: true,
      constituency: "Montgomeryshire and Glyndŵr",
    });
  });

  it("keeps postcodes.io's name if the code is missing or unknown", async () => {
    for (const codes of [undefined, {}, { parliamentary_constituency: "E14999999" }]) {
      server.use(
        http.get(POSTCODES, () => HttpResponse.json({ result: { parliamentary_constituency: "Somewhere", codes } })),
      );
      expect(await constituencyForPostcode("AB1 2CD")).toEqual({ ok: true, constituency: "Somewhere" });
    }
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

describe("placeForPostcode", () => {
  it("finds where a postcode is, and names its district", async () => {
    expect(await placeForPostcode(" SW1A 1AA ")).toEqual({
      ok: true,
      place: { latitude: 51.501009, longitude: -0.141588 },
      name: "Westminster",
    });
  });

  it("finds where an outcode is, naming the first district it reaches into", async () => {
    expect(await placeForPostcode("m1")).toEqual({
      ok: true,
      place: { latitude: 53.4794, longitude: -2.2353 },
      name: "Manchester",
    });
  });

  it("names the place by the postcode as typed, without a district", async () => {
    for (const district of [undefined, "", [], [""], 7]) {
      server.use(
        http.get(POSTCODES, () =>
          HttpResponse.json({ result: { latitude: 51.5, longitude: -0.1, admin_district: district } }),
        ),
      );
      expect(await placeForPostcode("ab1 2cd")).toEqual({
        ok: true,
        place: { latitude: 51.5, longitude: -0.1 },
        name: "AB1 2CD",
      });
    }
  });

  it("says when neither a postcode nor an outcode is found", async () => {
    expect(await placeForPostcode("ZZ1 1ZZ")).toEqual({ ok: false, reason: "not_found" });
  });

  it("says it's not found when postcodes.io doesn't say where it is", async () => {
    server.use(
      http.get(POSTCODES, () => new HttpResponse(null, { status: 404 })),
      http.get(OUTCODES, () => HttpResponse.json({ result: { latitude: null } })),
    );
    expect(await placeForPostcode("AB1")).toEqual({ ok: false, reason: "not_found" });
    server.use(http.get(OUTCODES, () => HttpResponse.json({})));
    expect(await placeForPostcode("AB1")).toEqual({ ok: false, reason: "not_found" });
  });

  it("fails on a server error or a network error, for a postcode or an outcode", async () => {
    server.use(http.get(POSTCODES, () => new HttpResponse(null, { status: 500 })));
    expect(await placeForPostcode("SW1A 1AA")).toEqual({ ok: false, reason: "failed" });
    server.use(
      http.get(POSTCODES, () => new HttpResponse(null, { status: 404 })),
      http.get(OUTCODES, () => new HttpResponse(null, { status: 502 })),
    );
    expect(await placeForPostcode("M1")).toEqual({ ok: false, reason: "failed" });
    server.use(http.get(OUTCODES, () => HttpResponse.error()));
    expect(await placeForPostcode("M1")).toEqual({ ok: false, reason: "failed" });
  });
});
