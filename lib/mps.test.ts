import { describe, expect, it } from "vitest";
import { changeCount, compareMps, type SyncedMp } from "./mps";

describe("compareMps", () => {
  const mp = (id: number, email = "a@parliament.uk"): SyncedMp => ({
    airtableId: `rec${id}`,
    name: `MP ${id}`,
    salutation: "Mr A",
    constituency: `Seat ${id}`,
    party: "P",
    email,
  });

  it("finds who joined, who left and whose details changed", () => {
    const changes = compareMps([mp(1), mp(2), mp(3)], [mp(1), mp(2, "new@parliament.uk"), mp(4)]);
    expect(changes).toEqual({ added: [mp(4)], removed: [mp(3)], changed: [mp(2, "new@parliament.uk")] });
    expect(changeCount(changes)).toBe(3);
    expect(changeCount(compareMps([mp(1)], [mp(1)]))).toBe(0);
  });
});
