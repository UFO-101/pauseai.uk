import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { homeEventsCopy } from "@/lib/content/home-events";
import { POST } from "./route";

function place(body: string) {
  return POST(new Request("http://localhost/api/events/place", { method: "POST", body }));
}

describe("POST /api/events/place", () => {
  it("returns where the postcode is, and its district", async () => {
    const res = await place(JSON.stringify({ postcode: "SW1A 1AA" }));
    expect(await res.json()).toEqual({
      ok: true,
      place: { latitude: 51.501009, longitude: -0.141588 },
      name: "Westminster",
    });
  });

  it("asks for a postcode when there isn't one", async () => {
    for (const body of [
      "not json",
      JSON.stringify({}),
      JSON.stringify({ postcode: 7 }),
      JSON.stringify({ postcode: "  " }),
    ]) {
      const res = await place(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, message: homeEventsCopy.postcodeRequired });
    }
  });

  it("says when the postcode isn't found, or postcodes.io fails", async () => {
    expect(await (await place(JSON.stringify({ postcode: "ZZ1 1ZZ" }))).json()).toEqual({
      ok: false,
      message: homeEventsCopy.postcodeNotFound,
    });
    server.use(http.get("https://api.postcodes.io/postcodes/:postcode", () => new HttpResponse(null, { status: 500 })));
    expect(await (await place(JSON.stringify({ postcode: "SW1A 1AA" }))).json()).toEqual({
      ok: false,
      message: homeEventsCopy.postcodeFailed,
    });
  });
});
