import { describe, expect, it } from "vitest";
import type { SupporterContact } from "./supporters";
import { givenPlaces, supporterPlace } from "./supporter-place";

/** A contact from `source` at `at`, with a place if given. */
function contact(
  source: SupporterContact["source"],
  at: string,
  place: Partial<SupporterContact> = {},
): SupporterContact {
  return { source, at, phone: null, postcode: null, latitude: null, longitude: null, city: null, ...place };
}

describe("supporterPlace", () => {
  it("is the newest place they gave themselves, before any event's", () => {
    const contacts = [
      contact("luma", "2026-10-10T00:00:00Z", { city: "Leeds", latitude: 53.8, longitude: -1.5 }),
      contact("member", "2026-09-01T00:00:00Z", { city: "York" }),
      contact("member", "2026-09-12T00:00:00Z", { city: "Hull" }),
    ];
    expect(supporterPlace(contacts)).toEqual({
      city: "Hull",
      latitude: null,
      longitude: null,
      source: "member",
      at: "2026-09-12T00:00:00Z",
      basis: "given",
    });
    expect(givenPlaces(contacts).map((c) => c.city)).toEqual(["York", "Hull"]);
  });

  it("falls back to the newest event's place, by its city or its coordinates", () => {
    expect(
      supporterPlace([
        contact("luma", "2026-09-01T00:00:00Z", { city: "Leeds" }),
        contact("luma", "2026-10-10T00:00:00Z", { latitude: 51.5, longitude: -0.1 }),
        contact("letter", "2026-10-11T00:00:00Z", { postcode: "M1 1AE" }),
      ]),
    ).toEqual({
      city: null,
      latitude: 51.5,
      longitude: -0.1,
      source: "luma",
      at: "2026-10-10T00:00:00Z",
      basis: "event",
    });
  });

  it("is null when nothing says where they are", () => {
    expect(supporterPlace([contact("letter", "2026-10-11T00:00:00Z", { postcode: "M1 1AE" })])).toBeNull();
    expect(supporterPlace([])).toBeNull();
  });
});
