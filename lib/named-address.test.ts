import { expect, it } from "vitest";
import { named } from "./named-address";

it("names someone by name and address, or either alone", () => {
  expect(named("Jo Seed", "jo@pauseai.uk")).toBe("Jo Seed <jo@pauseai.uk>");
  expect(named("", "jo@pauseai.uk")).toBe("jo@pauseai.uk");
  expect(named(undefined, "jo@pauseai.uk")).toBe("jo@pauseai.uk");
  expect(named("Jo Seed", null)).toBe("Jo Seed");
});
