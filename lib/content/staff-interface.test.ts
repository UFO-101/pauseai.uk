import { describe, expect, it } from "vitest";
import { staffCopy } from "./staff-interface";

describe("staff interface copy", () => {
  it("puts the counts into the import's result", () => {
    const result = staffCopy.import.result({ matched: 12, added: 3, alreadySet: 4 });
    for (const n of ["12", "3", "4"]) expect(result).toContain(n);
  });

  it("names every house and status", () => {
    expect(Object.keys(staffCopy.houses)).toEqual(["commons", "lords", "scottish-parliament", "senedd", "ni-assembly", "other"]);
    expect(Object.keys(staffCopy.statuses)).toEqual(["signed", "supports", "none"]);
  });
});
