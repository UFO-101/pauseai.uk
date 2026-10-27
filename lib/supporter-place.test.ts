import { describe, expect, it } from "vitest";
import type { SupporterContact } from "./supporters";
import { givenPlaces } from "./supporter-place";

/** A contact from `source` at `at`, with a city if given. */
function contact(source: SupporterContact["source"], at: string, city: string | null = null): SupporterContact {
  return { source, at, phone: null, postcode: null, latitude: null, longitude: null, city };
}

describe("givenPlaces", () => {
  it("is the cities they gave themselves, not their events'", () => {
    const contacts = [
      contact("luma", "2026-10-10T00:00:00Z", "Leeds"),
      contact("member", "2026-09-01T00:00:00Z", "York"),
      contact("letter", "2026-09-12T00:00:00Z"),
    ];
    expect(givenPlaces(contacts).map((c) => c.city)).toEqual(["York"]);
  });
});
