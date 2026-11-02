import { describe, expect, it } from "vitest";
import { DEFAULT_OWNER, ruleOwner } from "./event-owners";

describe("ruleOwner", () => {
  it("gives an event in Oxford, by its city or a tag in any case, to Sean, and any other to the default owner", () => {
    expect(ruleOwner({ city: "Oxford", tags: [] })).toBe("sean@pauseai.uk");
    expect(ruleOwner({ city: null, tags: ["Big events", "oxford"] })).toBe("sean@pauseai.uk");
    expect(ruleOwner({ city: "London", tags: ["London"] })).toBe(DEFAULT_OWNER);
    expect(ruleOwner({ city: null, tags: [] })).toBe("joseph@pauseai.uk");
  });
});
