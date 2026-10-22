import { expect, it } from "vitest";
import { changedFields } from "./field-changes";

it("gives each field that changed as before and after, a missing or undefined one as null, and leaves out the rest", () => {
  expect(
    changedFields(
      { name: "Polly", party: "Labour", email: null, constituency: "Ipswich" },
      { name: "Polly", party: "Independent", email: "p@example.org", salutation: "Ms P", constituency: undefined },
    ),
  ).toEqual({
    party: ["Labour", "Independent"],
    email: [null, "p@example.org"],
    salutation: [null, "Ms P"],
    constituency: ["Ipswich", null],
  });
  expect(changedFields({ a: null }, { a: undefined })).toEqual({});
});
