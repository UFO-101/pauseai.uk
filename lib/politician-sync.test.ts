import { describe, expect, it } from "vitest";
import { changeCount, comparePoliticians, renamedIn, type SyncedPolitician } from "./politician-sync";

const politician = (id: number, more: Partial<SyncedPolitician> = {}): SyncedPolitician => ({
  airtableId: `rec${id}`,
  name: `MP ${id}`,
  salutation: "Mr A",
  email: "a@parliament.uk",
  status: "in_office",
  house: "commons",
  constituency: `Seat ${id}`,
  party: "P",
  country: "england",
  notes: "",
  importantTarget: false,
  personalConnection: false,
  ...more,
});

describe("comparePoliticians", () => {
  it("finds who was added, whose record went and whose details changed", () => {
    const changes = comparePoliticians(
      [politician(1), politician(2), politician(3)],
      [politician(1), politician(2, { status: "retired" }), politician(4)],
    );
    expect(changes).toEqual({
      added: [politician(4)],
      removed: [politician(3)],
      changed: [politician(2, { status: "retired" })],
    });
    expect(changeCount(changes)).toBe(3);
    expect(changeCount(comparePoliticians([politician(1)], [politician(1)]))).toBe(0);
  });

  it("counts a record that's back in Airtable as changed, not added", () => {
    expect(comparePoliticians([], [politician(5)], new Set(["rec5"]))).toEqual({
      added: [],
      removed: [],
      changed: [politician(5)],
    });
  });
});

describe("renamedIn", () => {
  it("lists the changed politicians whose names changed, not one whose record came back", () => {
    const before = [politician(1), politician(2)];
    const after = [politician(1, { name: "Someone New" }), politician(2, { party: "Q" }), politician(3)];
    expect(renamedIn(before, comparePoliticians(before, after, new Set(["rec3"])))).toEqual([
      { airtableId: "rec1", from: "MP 1", to: "Someone New" },
    ]);
  });
});
