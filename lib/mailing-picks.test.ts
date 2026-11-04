import { describe, expect, it } from "vitest";
import { MOST_CHANGES, pickedWho } from "./mailing-picks";

const from = { params: { house: "commons" }, at: "2026-11-03T10:00:00.000Z", found: [1, 2, 3] };

describe("pickedWho", () => {
  it("is the names ticked when nothing was ticked from a filter", () => {
    expect(pickedWho({ ids: [4, 5] })).toEqual({ kind: "list", ids: [4, 5] });
  });

  it("is the group ticked from a filter, with those added and taken off since", () => {
    expect(pickedWho({ ids: [1, 2, 3], from })).toEqual({ kind: "group", from, plus: [], except: [] });
    expect(pickedWho({ ids: [1, 3, 9], from })).toEqual({ kind: "group", from, plus: [9], except: [2] });
  });

  it("is the names ticked once more than a few have been added or taken off", () => {
    const ids = [1, 2, 3, ...Array.from({ length: MOST_CHANGES + 1 }, (_, i) => 10 + i)];
    expect(pickedWho({ ids, from })).toEqual({ kind: "list", ids });
  });
});
