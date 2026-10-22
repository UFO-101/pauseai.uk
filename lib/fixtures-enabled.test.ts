import { afterEach, expect, it, vi } from "vitest";
import { fixturesEnabled } from "./fixtures-enabled";

afterEach(() => vi.unstubAllEnvs());

it("is on only with DATA_FIXTURES=1", () => {
  vi.stubEnv("DATA_FIXTURES", "1");
  expect(fixturesEnabled()).toBe(true);
  vi.stubEnv("DATA_FIXTURES", "");
  expect(fixturesEnabled()).toBe(false);
});
