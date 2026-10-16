import { afterEach, describe, expect, it, vi } from "vitest";
import { galleryEnabled } from "./enabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("galleryEnabled", () => {
  it("is on only in a fixture build", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(galleryEnabled()).toBe(true);
    vi.stubEnv("DATA_FIXTURES", "0");
    expect(galleryEnabled()).toBe(false);
  });
});
