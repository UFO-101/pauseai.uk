import { expect, it } from "vitest";
import { staffCopy } from "./content/staff-interface";
import { supporterTitle } from "./supporters";

it("names a supporter's page after them, or the stand-in when they have no name", () => {
  expect(supporterTitle({ name: "Jane Example" })).toBe("Jane Example");
  expect(supporterTitle({ name: null })).toBe(staffCopy.supporters.noName);
});
