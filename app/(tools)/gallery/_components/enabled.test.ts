import { afterEach, describe, expect, it, vi } from "vitest";
import { galleryEnabled, galleryGroup, requireGallery } from "./enabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";
const groups = [{ id: "ui", title: "UI kit", examples: [] }];

describe("galleryEnabled", () => {
  it("is on only in a fixture build", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(galleryEnabled()).toBe(true);
    vi.stubEnv("DATA_FIXTURES", "0");
    expect(galleryEnabled()).toBe(false);
  });
});

describe("requireGallery", () => {
  it("passes in a fixture build, and is a 404 otherwise", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(() => requireGallery()).not.toThrow();
    vi.stubEnv("DATA_FIXTURES", "0");
    expect(() => requireGallery()).toThrow(NOT_FOUND);
  });
});

describe("galleryGroup", () => {
  it("finds the group the URL names", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(galleryGroup(groups, "ui")).toBe(groups[0]);
  });

  it("is a 404 for a group there isn't, or outside a fixture build", () => {
    vi.stubEnv("DATA_FIXTURES", "1");
    expect(() => galleryGroup(groups, "nope")).toThrow(NOT_FOUND);
    vi.stubEnv("DATA_FIXTURES", "0");
    expect(() => galleryGroup(groups, "ui")).toThrow(NOT_FOUND);
  });
});
