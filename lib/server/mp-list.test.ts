import { afterEach, describe, expect, it, vi } from "vitest";
import { mpForConstituency, mpsFromRecords, testMp } from "./mp-list";

afterEach(() => vi.unstubAllEnvs());

describe("the MP list", () => {
  it("finds an MP by constituency", () => {
    expect(mpForConstituency("Cities of London and Westminster")).toMatchObject({ name: "Rachel Blake", salutation: "Ms Blake" });
    expect(mpForConstituency("Atlantis")).toBeUndefined();
  });

  it("trims emails, and treats a blank one as none", () => {
    const mps = mpsFromRecords([
      { Email: " a@parliament.uk ", "Full name or Title": "A", Salutation: "Mr A", Constituency: "One" },
      { Email: " ", "Full name or Title": "B", Salutation: "Ms B", Constituency: "Two" },
    ]);
    expect(mps.get("One")?.email).toBe("a@parliament.uk");
    expect(mps.get("Two")?.email).toBeNull();
  });

  it("sends the test MP's letters to the test inbox, if there is one", () => {
    vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org");
    expect(testMp()).toMatchObject({ name: "Testy McTestface MP", email: "test-mp@example.org" });
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect(testMp().email).toBeNull();
  });
});
