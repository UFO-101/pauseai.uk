import { afterEach, describe, expect, it, vi } from "vitest";
import { mpForConstituency, mpsByConstituency, testMp } from "./mp-list";

afterEach(() => vi.unstubAllEnvs());

describe("the MP list", () => {
  it("finds an MP by constituency", () => {
    expect(mpForConstituency("Cities of London and Westminster")).toMatchObject({ name: "Rachel Blake", salutation: "Ms Blake" });
    expect(mpForConstituency("Atlantis")).toBeUndefined();
  });

  it("keeps only what the form needs", () => {
    const mps = mpsByConstituency([{ parliamentId: 1, name: "A", salutation: "Mr A", constituency: "One", party: "P", email: null }]);
    expect(mps.get("One")).toEqual({ name: "A", salutation: "Mr A", constituency: "One", email: null });
  });

  it("includes the MPs Parliament lists without an email", () => {
    for (const constituency of ["Holborn and St Pancras", "New Forest East", "West Tyrone"]) {
      expect(mpForConstituency(constituency)?.email).toBeNull();
    }
  });

  it("sends the test MP's letters to the test inbox, if there is one", () => {
    vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org");
    expect(testMp()).toMatchObject({ name: "Testy McTestface MP", email: "test-mp@example.org" });
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect(testMp().email).toBeNull();
  });
});
