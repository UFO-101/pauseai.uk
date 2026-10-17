import { describe, expect, it } from "vitest";
import { found } from "./found";

describe("found", () => {
  it("passes a value through, falsy ones included", () => {
    const post = { slug: "a" };
    expect(found(post)).toBe(post);
    expect(found(0)).toBe(0);
    expect(found("")).toBe("");
  });

  it("is a 404 for nothing", () => {
    expect(() => found(undefined)).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(() => found(null)).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
